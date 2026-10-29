import { describe, expect, it } from "vitest";
import {
  DEFAULT_REMINDER_OFFSET_MINUTES,
  REMINDER_OFFSET_MINUTES,
  assertTermStart,
  durationMinutes,
  isMonday,
  parseDateOnly,
  parseLocalTime,
  toUtcInstant,
  validateCourseDraft,
  weekdayIndex,
} from "../index";
import type { Course, CourseDraft } from "../index";

/** 2026-09-07 is a Monday, i.e. the first day of teaching week 1. */
const TERM_START = "2026-09-07";

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: "course-1",
    ownerId: "user-1",
    code: "CS101",
    name: "Database Systems",
    teacher: "Dr. Wang",
    weekday: "MONDAY",
    startTime: "09:00",
    endTime: "10:30",
    location: "Library D, 1F",
    firstWeek: 1,
    lastWeek: 16,
    weekParity: "ALL",
    ...overrides,
  };
}

function makeDraft(overrides: Partial<CourseDraft> = {}): CourseDraft {
  return {
    code: "CS101",
    name: "Database Systems",
    teacher: "Dr. Wang",
    weekday: "MONDAY",
    startTime: "09:00",
    endTime: "10:30",
    location: "Library D, 1F",
    firstWeek: 1,
    lastWeek: 16,
    weekParity: "ALL",
    reminderOffsetMinutes: DEFAULT_REMINDER_OFFSET_MINUTES,
    ...overrides,
  };
}

describe("parseDateOnly / parseLocalTime", () => {
  it("accepts valid dates and times", () => {
    expect(parseDateOnly("2026-09-07")).toEqual({ year: 2026, month: 9, day: 7 });
    expect(parseLocalTime("09:05")).toEqual({ hours: 9, minutes: 5 });
    expect(parseLocalTime("00:00")).toEqual({ hours: 0, minutes: 0 });
    expect(parseLocalTime("23:59")).toEqual({ hours: 23, minutes: 59 });
  });

  it("rejects malformed and impossible values", () => {
    expect(() => parseDateOnly("07-09-2026")).toThrow(/expected YYYY-MM-DD/);
    expect(() => parseDateOnly("2026-02-31")).toThrow(/does not exist/);
    expect(() => parseLocalTime("9:00")).toThrow(/expected HH:mm/);
    expect(() => parseLocalTime("24:00")).toThrow(/expected HH:mm/);
    expect(() => parseLocalTime("09:60")).toThrow(/expected HH:mm/);
  });
});

describe("term start", () => {
  it("only accepts a Monday as the first teaching day", () => {
    expect(isMonday(TERM_START)).toBe(true);
    expect(isMonday("2026-09-08")).toBe(false);
    expect(() => assertTermStart("2026-09-08")).toThrow(/must be a Monday/);
    expect(() => assertTermStart(TERM_START)).not.toThrow();
  });
});

describe("toUtcInstant", () => {
  it("stores the Asia/Shanghai wall-clock time as UTC (FR-CR-01, timezone rule)", () => {
    // 09:00 in Shanghai is 01:00 UTC.
    expect(toUtcInstant(TERM_START, 0, "09:00").toISOString()).toBe("2026-09-07T01:00:00.000Z");
    // Week 3 Monday is 14 days later.
    expect(toUtcInstant(TERM_START, 14, "14:30").toISOString()).toBe("2026-09-21T06:30:00.000Z");
  });

  it("crosses a month boundary without drifting", () => {
    expect(toUtcInstant("2026-09-28", 7, "08:00").toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });
});

describe("weekdayIndex", () => {
  it("maps weekdays to their offset from Monday", () => {
    expect(weekdayIndex("MONDAY")).toBe(0);
    expect(weekdayIndex("FRIDAY")).toBe(4);
    expect(weekdayIndex("SUNDAY")).toBe(6);
  });
});

describe("durationMinutes", () => {
  it("derives the class length from the wall-clock times", () => {
    expect(durationMinutes(makeCourse())).toBe(90);
    expect(durationMinutes(makeCourse({ startTime: "13:15", endTime: "14:00" }))).toBe(45);
  });
});

describe("validateCourseDraft", () => {
  it("accepts a complete draft (CR-AC-01)", () => {
    expect(validateCourseDraft(makeDraft())).toEqual({ ok: true });
  });

  it("accepts a draft without an optional teacher (FR-CR-01)", () => {
    expect(validateCourseDraft(makeDraft({ teacher: "" }))).toEqual({ ok: true });
  });

  it("rejects an end time before the start time (CR-AC-02)", () => {
    const result = validateCourseDraft(makeDraft({ startTime: "14:00", endTime: "13:00" }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const error = result.errors.find((item) => item.code === "END_BEFORE_START");
      expect(error?.field).toBe("endTime");
    }
  });

  it("rejects an end time equal to the start time (CR-AC-02)", () => {
    const result = validateCourseDraft(makeDraft({ startTime: "09:00", endTime: "09:00" }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toContain("END_BEFORE_START");
    }
  });

  it("rejects a malformed course code", () => {
    const result = validateCourseDraft(makeDraft({ code: "cs-101" }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toContain("COURSE_CODE_INVALID");
    }
  });

  it("rejects an empty name", () => {
    const result = validateCourseDraft(makeDraft({ name: "   " }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toContain("COURSE_NAME_REQUIRED");
    }
  });

  it("rejects malformed times and inverted week ranges", () => {
    const result = validateCourseDraft(
      makeDraft({ startTime: "9:00", firstWeek: 10, lastWeek: 4 }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const codes = result.errors.map((error) => error.code);
      expect(codes).toContain("START_TIME_INVALID");
      expect(codes).toContain("WEEK_RANGE_INVALID");
    }
  });

  it("rejects teaching weeks outside the term (CR-AC-01)", () => {
    const result = validateCourseDraft(makeDraft({ firstWeek: 0, lastWeek: 25 }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const codes = result.errors.map((error) => error.code);
      expect(codes).toContain("FIRST_WEEK_INVALID");
      expect(codes).toContain("LAST_WEEK_INVALID");
    }
  });

  it("accepts a disabled reminder and rejects an offset outside FR-CR-04", () => {
    expect(validateCourseDraft(makeDraft({ reminderOffsetMinutes: null }))).toEqual({ ok: true });

    for (const offset of REMINDER_OFFSET_MINUTES) {
      expect(validateCourseDraft(makeDraft({ reminderOffsetMinutes: offset }))).toEqual({
        ok: true,
      });
    }

    const result = validateCourseDraft(makeDraft({ reminderOffsetMinutes: 7 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toContain("REMINDER_OFFSET_INVALID");
    }
  });

  it("offers exactly the reminder options from FR-CR-04", () => {
    expect([...REMINDER_OFFSET_MINUTES].sort((a, b) => a - b)).toEqual([10, 15, 30, 60]);
    expect(DEFAULT_REMINDER_OFFSET_MINUTES).toBe(15);
  });

  it("rejects an over-long teacher name", () => {
    const result = validateCourseDraft(makeDraft({ teacher: "x".repeat(61) }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toContain("TEACHER_TOO_LONG");
    }
  });

  it("reports every problem at once instead of stopping at the first", () => {
    const result = validateCourseDraft(
      makeDraft({ code: "", name: "", startTime: "bad", endTime: "bad" }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    }
  });
});
