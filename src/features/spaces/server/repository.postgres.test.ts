// @vitest-environment node
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_SPACES } from "../demo-data";
import { createPrismaSpaceRepository } from "./repository";
import { createSpaceService } from "./service";

// Explicit opt-in to an isolated, migrated test database. Never uses DATABASE_URL.
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("real PostgreSQL booking constraints", () => {
  const clients = [
    new PrismaClient({ datasourceUrl: url }),
    new PrismaClient({ datasourceUrl: url }),
  ];
  const repos = clients.map(createPrismaSpaceRepository);
  const prefix = `sp-test-${randomUUID()}`;
  const users = [`${prefix}-u1`, `${prefix}-u2`];
  const seats = [`${prefix}-s1`, `${prefix}-s2`];
  const start = Math.ceil(Date.now() / 1800000) * 1800000 + 7200000;
  const range = {
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + 3600000).toISOString(),
  };
  beforeAll(async () => {
    for (const id of users)
      await clients[0].user.create({
        data: {
          id,
          email: `${id}@example.test`,
          name: "Fictional test student",
          passwordHash: "not-a-login-hash",
        },
      });
    for (const [i, id] of seats.entries())
      await clients[0].space.create({ data: { ...DEMO_SPACES[i], id } });
  });
  afterAll(async () => {
    try {
      await clients[0].spaceBooking.deleteMany({ where: { userId: { in: users } } });
      await clients[0].space.deleteMany({ where: { id: { in: seats } } });
      await clients[0].user.deleteMany({ where: { id: { in: users } } });
    } finally {
      await Promise.all(clients.map((c) => c.$disconnect()));
    }
  });
  it("permits one overlapping seat insert from independent connections (SP-AC-04)", async () => {
    const results = await Promise.allSettled(
      repos.map((r, i) =>
        r.transaction({ userId: users[i], spaceId: seats[0] }, (tx) =>
          tx.createBooking({ ...range, userId: users[i], spaceId: seats[0], status: "CONFIRMED" }),
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { status: 409, code: "BOOKING_CONFLICT" },
    });
    await clients[0].spaceBooking.deleteMany({ where: { userId: { in: users } } });
  });
  it("rejects concurrent bookings by one student on different seats (SP-AC-05)", async () => {
    const results = await Promise.allSettled(
      repos.map((r, i) =>
        r.transaction({ userId: users[0], spaceId: seats[i] }, (tx) =>
          tx.createBooking({ ...range, userId: users[0], spaceId: seats[i], status: "CONFIRMED" }),
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({ reason: { status: 409 } });
    await clients[0].spaceBooking.deleteMany({ where: { userId: { in: users } } });
  });
  it("persists cancellation, permits rebooking and adjacent intervals (SP-AC-03, SP-AC-06)", async () => {
    const service = createSpaceService({
      repository: repos[0],
      currentActor: async () => ({ id: users[0], role: "STUDENT" }),
      now: () => new Date(),
    });
    const booking = await service.book(seats[0], range);
    await service.cancel(booking.id);
    expect(await clients[1].spaceBooking.findUnique({ where: { id: booking.id } })).toMatchObject({
      status: "CANCELLED",
    });
    await service.book(seats[0], range);
    await service.book(seats[0], {
      startsAt: range.endsAt,
      endsAt: new Date(start + 5400000).toISOString(),
    });
    expect(await repos[1].listForUser(users[0])).toHaveLength(3);
  });
});
