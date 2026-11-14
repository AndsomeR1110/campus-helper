import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { readSchoolSync, saveSchoolSync, listSchoolCourses } from "./index";
const ownerId = "auto-test-" + randomUUID(),
  otherId = "auto-test-" + randomUUID();
const activity = {
  identity: "fictional-activity",
  moduleId: "TST123TC",
  name: "TST123TC-Lecture",
  staff: "Fictional Teacher",
  location: "Demo Room",
  scheduledDay: "0",
  startTime: "2000-01-01T02:00:00Z",
  endTime: "2000-01-01T04:00:00Z",
  weekPattern: "1-3,5,7",
};
const payload = { term: "2026/27 S1", activities: [activity] };
describe.skipIf(!process.env.DATABASE_URL)("AUTO-04 PostgreSQL snapshot isolation", () => {
  beforeAll(async () => {
    await prisma.user.createMany({
      data: [ownerId, otherId].map((id) => ({
        id,
        email: id + "@example.test",
        name: "Automatic sync fixture",
        passwordHash: "not-a-login-hash",
        role: "STUDENT",
      })),
    });
    await prisma.course.create({
      data: {
        ownerId,
        code: "MAN900",
        name: "Manual fixture",
        weekday: "MONDAY",
        startTime: "09:00",
        endTime: "10:00",
        firstWeek: 1,
        lastWeek: 13,
      },
    });
  });
  beforeEach(async () => {
    await prisma.schoolTimetable.deleteMany({ where: { ownerId } });
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
    await prisma.$disconnect();
  });
  it("replaces changed and deleted school activities while preserving manual courses", async () => {
    await saveSchoolSync(ownerId, payload, 0);
    await saveSchoolSync(
      ownerId,
      {
        ...payload,
        activities: [{ ...activity, identity: "new-fictional", location: "Changed Room" }],
      },
      1,
    );
    const school = await listSchoolCourses(ownerId);
    expect(school).toHaveLength(1);
    expect(school[0].location).toBe("Changed Room");
    expect(school[0].schoolWeeks).toEqual([1, 2, 3, 5, 7]);
    expect(await prisma.course.count({ where: { ownerId } })).toBe(1);
    expect((await readSchoolSync(ownerId)).version).toBe(2);
  });
  it("never replaces an existing snapshot with empty or invalid data", async () => {
    await saveSchoolSync(ownerId, payload, 0);
    await expect(saveSchoolSync(ownerId, { ...payload, activities: [] }, 1)).rejects.toThrow();
    expect((await readSchoolSync(ownerId)).version).toBe(1);
    expect(await listSchoolCourses(ownerId)).toHaveLength(1);
  });
  it("allows only one writer with the same baseline revision", async () => {
    const results = await Promise.allSettled([
      saveSchoolSync(ownerId, payload, 0),
      saveSchoolSync(ownerId, payload, 0),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect((await readSchoolSync(ownerId)).version).toBe(1);
  });
  it("keeps each app account isolated and rejects stale updates", async () => {
    await saveSchoolSync(ownerId, payload, 0);
    expect(await listSchoolCourses(otherId)).toEqual([]);
    await expect(saveSchoolSync(ownerId, payload, 99)).rejects.toThrow("changed");
    expect((await readSchoolSync(ownerId)).version).toBe(1);
  });
});
