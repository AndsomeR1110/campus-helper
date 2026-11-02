import { describe, expect, it } from "vitest";
import {
  MAX_WEEK,
  expandOccurrences,
  getNextOccurrence,
  getOccurrencesInWeek,
  groupOccurrencesByDay,
  isWeekActive,
  listActiveWeeks,
  toLocalDate,
} from "../index";
import type { Course } from "../index";

/** 2026-09-07 is a Monday, i.e. the first day of teaching week 1. */
const TERM_START = "2026-09-07";

const WIDE_RANGE = {
  from: new Date("2026-09-01T00:00:00.000Z"),
  to: new Date("2027-03-31T00:00:00.000Z"),
};

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

describe("isWeekActive", () => {
  it("respects the teaching-week bounds", () => {
    const course = makeCourse({ firstWeek: 3, lastWeek: 8 });

    expect(isWeekActive(course, 2)).toBe(false);
    expect(isWeekActive(course, 3)).toBe(true);
    expect(isWeekActive(course, 8)).toBe(true);
    expect(isWeekActive(course, 9)).toBe(false);
  });

  it("respects odd / even week patterns", () => {
    expect(isWeekActive(makeCourse({ weekParity: "ODD" }), 1)).toBe(true);
    expect(isWeekActive(makeCourse({ weekParity: "ODD" }), 2)).toBe(false);
    expect(isWeekActive(makeCourse({ weekParity: "EVEN" }), 2)).toBe(true);
    expect(isWeekActive(makeCourse({ weekParity: "EVEN" }), 3)).toBe(false);
  });
});

describe("listActiveWeeks", () => {
  it("lists the contiguous weeks for an every-week course", () => {
    expect(listActiveWeeks(makeCourse({ firstWeek: 1, lastWeek: 4 }))).toEqual([1, 2, 3, 4]);
  });

  it("skips the inactive weeks for an odd-week course", () => {
    expect(listActiveWeeks(makeCourse({ firstWeek: 1, lastWeek: 5, weekParity: "ODD" }))).toEqual([
      1, 3, 5,
    ]);
  });

  it("never goes past the last teaching week of the term", () => {
    const weeks = listActiveWeeks(makeCourse({ firstWeek: 1, lastWeek: 40 }));

    expect(weeks.at(-1)).toBe(MAX_WEEK);
    expect(weeks).toHaveLength(MAX_WEEK);
  });
});

describe("expandOccurrences", () => {
  it("puts a weekly course on the right weekday and week (CR-AC-01)", () => {
    const occurrences = expandOccurrences(makeCourse({ lastWeek: 3 }), TERM_START, WIDE_RANGE);

    expect(occurrences).toHaveLength(3);
    expect(occurrences.map((item) => item.weekNumber)).toEqual([1, 2, 3]);
    expect(occurrences.map((item) => item.startsAt)).toEqual([
      "2026-09-07T01:00:00.000Z",
      "2026-09-14T01:00:00.000Z",
      "2026-09-21T01:00:00.000Z",
    ]);
    expect(occurrences[0]?.endsAt).toBe("2026-09-07T02:30:00.000Z");
    expect(occurrences[0]?.courseName).toBe("Database Systems");
    expect(occurrences[0]?.location).toBe("Library D, 1F");
  });

  it("honours the weekday offset", () => {
    const [first] = expandOccurrences(
      makeCourse({ weekday: "THURSDAY", lastWeek: 1 }),
      TERM_START,
      WIDE_RANGE,
    );

    // Week 1 Monday is 2026-09-07, so Thursday is 2026-09-10 at 01:00 UTC.
    expect(first?.startsAt).toBe("2026-09-10T01:00:00.000Z");
  });

  it("keeps occurrence ids stable and unique", () => {
    const occurrences = expandOccurrences(makeCourse({ lastWeek: 2 }), TERM_START, WIDE_RANGE);
    const ids = occurrences.map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("course-1:2026-09-07T01:00:00.000Z");
  });

  it("skips weeks excluded by the odd / even pattern", () => {
    const occurrences = expandOccurrences(
      makeCourse({ weekParity: "ODD", lastWeek: 4 }),
      TERM_START,
      WIDE_RANGE,
    );

    expect(occurrences.map((item) => item.weekNumber)).toEqual([1, 3]);
  });

  it("only returns occurrences inside the requested range", () => {
    const occurrences = expandOccurrences(makeCourse({ lastWeek: 10 }), TERM_START, {
      from: new Date("2026-09-10T00:00:00.000Z"),
      to: new Date("2026-09-25T00:00:00.000Z"),
    });

    expect(occurrences.map((item) => item.startsAt)).toEqual([
      "2026-09-14T01:00:00.000Z",
      "2026-09-21T01:00:00.000Z",
    ]);
  });

  it("rejects a term start that is not a Monday", () => {
    expect(() => expandOccurrences(makeCourse(), "2026-09-09", WIDE_RANGE)).toThrow(
      /must be a Monday/,
    );
  });
});

describe("getOccurrencesInWeek", () => {
  it("returns the single class of that week (CR-AC-01)", () => {
    const items = getOccurrencesInWeek(makeCourse(), TERM_START, 2);

    expect(items).toHaveLength(1);
    expect(items[0]?.startsAt).toBe("2026-09-14T01:00:00.000Z");
    expect(items[0]?.weekNumber).toBe(2);
  });

  it("returns nothing for a week the course does not run in (CR-AC-04)", () => {
    expect(getOccurrencesInWeek(makeCourse({ firstWeek: 3 }), TERM_START, 1)).toEqual([]);
    expect(getOccurrencesInWeek(makeCourse({ weekParity: "ODD" }), TERM_START, 2)).toEqual([]);
  });
});

describe("getNextOccurrence", () => {
  it("returns the first class at or after now", () => {
    // The week 2 class already started, so the next one is week 3.
    const now = new Date("2026-09-14T02:00:00.000Z");
    const next = getNextOccurrence(makeCourse({ lastWeek: 5 }), TERM_START, now);

    expect(next?.startsAt).toBe("2026-09-21T01:00:00.000Z");
  });

  it("returns null when the course has already finished (CR-AC-04)", () => {
    expect(getNextOccurrence(makeCourse(), TERM_START, new Date("2027-06-01T00:00:00.000Z"))).toBe(
      null,
    );
  });
});

describe("week view grouping", () => {
  it("converts a UTC instant to the Asia/Shanghai calendar date", () => {
    // 01:00 UTC on 2026-09-07 is 09:00 in Shanghai, still the same day.
    expect(toLocalDate("2026-09-07T01:00:00.000Z")).toBe("2026-09-07");
    // 17:00 UTC on 2026-09-07 is 01:00 on 2026-09-08 in Shanghai.
    expect(toLocalDate("2026-09-07T17:00:00.000Z")).toBe("2026-09-08");
  });

  it("groups occurrences by local day in chronological order", () => {
    const monday = makeCourse({ id: "mon", weekday: "MONDAY", lastWeek: 1 });
    const wednesday = makeCourse({ id: "wed", weekday: "WEDNESDAY", lastWeek: 1 });
    const occurrences = [
      ...expandOccurrences(wednesday, TERM_START, WIDE_RANGE),
      ...expandOccurrences(monday, TERM_START, WIDE_RANGE),
    ];

    const days = groupOccurrencesByDay(occurrences);

    expect(days.map((day) => day.date)).toEqual(["2026-09-07", "2026-09-09"]);
    expect(days[0]?.occurrences[0]?.courseId).toBe("mon");
    expect(days[1]?.occurrences[0]?.courseId).toBe("wed");
  });
});
