// @vitest-environment node
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";
import { cancelBooking, createBooking, updateSlotStatus } from "./mutations";

/**
 * Real-PostgreSQL tests for the two things a mock cannot prove:
 *
 *   1. **Concurrency** — two students submitting the same slot at the same moment: exactly
 *      one CONFIRMED row may exist (OH-AC-03). The guarantee is the partial unique index
 *      `office_bookings_active_slot_unique`; this test drives two independent connections
 *      so the race is real, not simulated.
 *   2. **The regression from the PR #5 review** — a student must be able to cancel the same
 *      slot repeatedly (book → cancel → book → cancel), which a plain unique key used to
 *      make impossible (OH-AC-05).
 *
 * Opt-in, and never uses DATABASE_URL: `TEST_DATABASE_URL=postgres://… npx vitest run`.
 * The schema must be migrated (`npx prisma migrate deploy` against that database).
 */

const url = process.env.TEST_DATABASE_URL;
const MINUTE = 60_000;

describe.skipIf(!url)("office hour booking against real PostgreSQL", () => {
  const clients = [
    new PrismaClient({ datasourceUrl: url }),
    new PrismaClient({ datasourceUrl: url }),
  ];
  const [a, b] = clients;
  const prefix = `oh-test-${randomUUID()}`;
  const teacherUserId = `${prefix}-teacher-user`;
  const teacherId = `${prefix}-teacher`;
  const students = [`${prefix}-s1`, `${prefix}-s2`];

  /** A fresh slot starting two hours from now, so `canBook` accepts it. */
  function slotTimes() {
    const startsAt = new Date(Date.now() + 120 * MINUTE);
    return { startsAt, endsAt: new Date(startsAt.getTime() + 30 * MINUTE) };
  }

  let slotId: string;

  beforeAll(async () => {
    await a.user.create({
      data: {
        id: teacherUserId,
        email: `${teacherUserId}@example.test`,
        name: "Fictional teacher",
        passwordHash: "not-a-login-hash",
        role: "TEACHER",
      },
    });
    await a.teacherProfile.create({
      data: { id: teacherId, userId: teacherUserId, displayName: "Prof. Test", department: "CS" },
    });
    for (const id of students) {
      await a.user.create({
        data: {
          id,
          email: `${id}@example.test`,
          name: "Fictional test student",
          passwordHash: "not-a-login-hash",
        },
      });
    }
  });

  beforeEach(async () => {
    await a.officeBooking.deleteMany({ where: { studentId: { in: students } } });
    await a.officeSlot.deleteMany({ where: { teacherId } });
    const { startsAt, endsAt } = slotTimes();
    const slot = await a.officeSlot.create({
      data: { teacherId, startsAt, endsAt, status: "OPEN", location: "A-101" },
      select: { id: true },
    });
    slotId = slot.id;
  });

  afterAll(async () => {
    try {
      await a.officeBooking.deleteMany({ where: { studentId: { in: students } } });
      await a.officeSlot.deleteMany({ where: { teacherId } });
      await a.teacherProfile.deleteMany({ where: { id: teacherId } });
      await a.user.deleteMany({ where: { id: { in: [teacherUserId, ...students] } } });
    } finally {
      await Promise.all(clients.map((client) => client.$disconnect()));
    }
  });

  it("lets exactly one of two concurrent bookings win (OH-AC-03)", async () => {
    const results = await Promise.allSettled([
      createBooking({ slotId, studentId: students[0] }, a),
      createBooking({ slotId, studentId: students[1] }, b),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const error = rejected[0].reason;
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("SLOT_ALREADY_BOOKED");

    const confirmed = await a.officeBooking.count({ where: { slotId, status: "CONFIRMED" } });
    expect(confirmed).toBe(1);
  });

  it("never lets the same student hold two active bookings for one slot", async () => {
    await createBooking({ slotId, studentId: students[0] }, a);

    await expect(createBooking({ slotId, studentId: students[0] }, b)).rejects.toMatchObject({
      code: "SLOT_ALREADY_BOOKED",
    });
    expect(await a.officeBooking.count({ where: { slotId, status: "CONFIRMED" } })).toBe(1);
  });

  it("allows book → cancel → book → cancel on the same slot (the PR #5 regression)", async () => {
    const first = await createBooking({ slotId, studentId: students[0] }, a);
    await cancelBooking({ bookingId: first.id, studentId: students[0] }, a);

    const second = await createBooking({ slotId, studentId: students[0] }, a);
    // This is the second cancellation that used to fail with a unique violation.
    const cancelled = await cancelBooking({ bookingId: second.id, studentId: students[0] }, a);

    expect(cancelled.status).toBe("CANCELLED");
    const rows = await a.officeBooking.findMany({
      where: { slotId, studentId: students[0] },
      select: { status: true },
    });
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.status === "CANCELLED")).toBe(true);
  });

  it("frees the slot for somebody else after a cancellation", async () => {
    const mine = await createBooking({ slotId, studentId: students[0] }, a);
    await expect(createBooking({ slotId, studentId: students[1] }, b)).rejects.toBeInstanceOf(
      ApiError,
    );

    await cancelBooking({ bookingId: mine.id, studentId: students[0] }, a);

    const theirs = await createBooking({ slotId, studentId: students[1] }, b);
    expect(theirs.status).toBe("CONFIRMED");
  });

  it("withdrawing a slot cancels the booking and notifies the student (OH-AC-07)", async () => {
    const booking = await createBooking({ slotId, studentId: students[0] }, a);

    const result = await updateSlotStatus(
      {
        userId: teacherUserId,
        slotId,
        status: "CANCELLED",
      },
      a,
    );

    expect(result).toMatchObject({ status: "CANCELLED", cancelledBookings: 1 });

    const stored = await a.officeBooking.findUniqueOrThrow({
      where: { id: booking.id },
      select: { status: true, cancelledAt: true },
    });
    expect(stored.status).toBe("CANCELLED");
    expect(stored.cancelledAt).not.toBeNull();

    const notifications = await a.notification.findMany({
      where: { userId: students[0], dedupeKey: { startsWith: `office-slot:${slotId}:` } },
      select: { type: true, href: true, dedupeKey: true },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: "OFFICE_HOUR_CANCELLED",
      href: `/office-hours/${slotId}`,
    });

    // Withdrawing twice must not notify twice and must not touch other rows.
    const again = await updateSlotStatus({ userId: teacherUserId, slotId, status: "CANCELLED" }, a);
    expect(again.cancelledBookings).toBe(0);
    expect(
      await a.notification.count({
        where: { userId: students[0], dedupeKey: { startsWith: `office-slot:${slotId}:` } },
      }),
    ).toBe(1);
  });

  it("refuses to let a teacher withdraw somebody else's slot", async () => {
    await expect(
      updateSlotStatus({ userId: "another-teacher", slotId, status: "CANCELLED" }, a),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    // …and the slot is untouched.
    expect((await a.officeSlot.findUniqueOrThrow({ where: { id: slotId } })).status).toBe("OPEN");
  });
});
