import { describe, expect, it } from "vitest";
import { buildReminderDedupeKey, buildReminderNotification, isReminderDue } from "../index";

const STARTS_AT = "2026-11-03T01:00:00.000Z";

describe("buildReminderDedupeKey", () => {
  it("is stable for the same class and offset (NT-AC-01)", () => {
    expect(buildReminderDedupeKey("c1", STARTS_AT, 15)).toBe(
      buildReminderDedupeKey("c1", STARTS_AT, 15),
    );
  });

  it("differs per course, start time and offset", () => {
    const base = buildReminderDedupeKey("c1", STARTS_AT, 15);

    expect(buildReminderDedupeKey("c2", STARTS_AT, 15)).not.toBe(base);
    expect(buildReminderDedupeKey("c1", "2026-11-10T01:00:00.000Z", 15)).not.toBe(base);
    expect(buildReminderDedupeKey("c1", STARTS_AT, 30)).not.toBe(base);
  });
});

describe("buildReminderNotification", () => {
  it("names the course and the offset (CR-AC-05)", () => {
    const reminder = buildReminderNotification({
      courseId: "c1",
      courseCode: "CS101",
      courseName: "Database Systems",
      location: "Library D",
      startsAt: STARTS_AT,
      offsetMinutes: 15,
      weekNumber: 3,
    });

    expect(reminder.title).toBe("CS101 starts in 15 minutes");
    expect(reminder.body).toBe("Database Systems in Library D.");
    expect(reminder.href).toBe("/schedule?week=3");
    expect(reminder.dedupeKey).toBe(buildReminderDedupeKey("c1", STARTS_AT, 15));
  });

  it("omits the location when there is none", () => {
    const reminder = buildReminderNotification({
      courseId: "c1",
      courseCode: "CS101",
      courseName: "Database Systems",
      location: null,
      startsAt: STARTS_AT,
      offsetMinutes: 10,
      weekNumber: 1,
    });

    expect(reminder.body).toBe("Database Systems.");
  });
});

describe("isReminderDue", () => {
  const start = Date.parse(STARTS_AT);

  it("is due exactly at the offset before the class", () => {
    expect(isReminderDue(STARTS_AT, 15, new Date(start - 15 * 60_000))).toBe(true);
  });

  it("is not due earlier than the offset (CR-AC-06)", () => {
    expect(isReminderDue(STARTS_AT, 15, new Date(start - 16 * 60_000))).toBe(false);
  });

  it("still fires a little late, but not after the class started long ago", () => {
    expect(isReminderDue(STARTS_AT, 15, new Date(start + 2 * 60_000))).toBe(true);
    expect(isReminderDue(STARTS_AT, 15, new Date(start + 30 * 60_000))).toBe(false);
  });

  it("ignores an unparsable timestamp", () => {
    expect(isReminderDue("not-a-date", 15, new Date(start))).toBe(false);
  });
});
