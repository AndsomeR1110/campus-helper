import { describe, expect, it } from "vitest";
import {
  ICS_PROD_ID,
  buildCourseCalendar,
  buildIcsCalendar,
  courseOccurrencesToIcsEvents,
  escapeIcsText,
  expandOccurrences,
  foldIcsLine,
  formatIcsUtc,
} from "../index";
import type { Course, IcsEvent } from "../index";

const TERM_START = "2026-09-07";
const STAMP = new Date("2026-09-01T00:00:00.000Z");

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
    lastWeek: 2,
    weekParity: "ALL",
    ...overrides,
  };
}

function makeEvent(overrides: Partial<IcsEvent> = {}): IcsEvent {
  return {
    uid: "course-1:2026-09-07T01:00:00.000Z",
    summary: "CS101 Database Systems",
    startsAt: "2026-09-07T01:00:00.000Z",
    endsAt: "2026-09-07T02:30:00.000Z",
    ...overrides,
  };
}

/** Undoes RFC 5545 line folding so a document can be asserted on directly. */
function unfold(document: string): string[] {
  return document.replace(/\r\n /g, "").split("\r\n").filter(Boolean);
}

describe("formatIcsUtc", () => {
  it("writes a UTC instant in ICS basic format", () => {
    expect(formatIcsUtc("2026-09-07T01:00:00.000Z")).toBe("20260907T010000Z");
    expect(formatIcsUtc(new Date("2026-12-31T23:30:00.000Z"))).toBe("20261231T233000Z");
  });

  it("rejects an invalid date instead of silently emitting a broken file", () => {
    expect(() => formatIcsUtc("not-a-date")).toThrow(/Invalid date/);
  });
});

describe("escapeIcsText", () => {
  it("escapes the four characters RFC 5545 reserves", () => {
    expect(escapeIcsText("CS101, Room 3; Building A")).toBe("CS101\\, Room 3\\; Building A");
    expect(escapeIcsText("line one\nline two")).toBe("line one\\nline two");
    expect(escapeIcsText("back\\slash")).toBe("back\\\\slash");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeIcsText("Database Systems")).toBe("Database Systems");
  });
});

describe("foldIcsLine", () => {
  it("leaves short lines alone", () => {
    const line = "SUMMARY:CS101 Database Systems";

    expect(foldIcsLine(line)).toBe(line);
  });

  it("folds long lines so every physical line stays within 75 octets", () => {
    const line = `SUMMARY:${"A".repeat(200)}`;
    const folded = foldIcsLine(line);
    const physical = folded.split("\r\n");

    expect(physical.length).toBeGreaterThan(1);
    for (const part of physical) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    }
    for (const part of physical.slice(1)) {
      expect(part.startsWith(" ")).toBe(true);
    }
  });

  it("never splits a multi-byte character", () => {
    const line = `LOCATION:${"图书馆".repeat(30)}`;
    const folded = foldIcsLine(line);

    for (const part of folded.split("\r\n")) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
      expect(part.includes("\uFFFD")).toBe(false);
    }
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });
});

describe("buildIcsCalendar", () => {
  it("produces a valid VCALENDAR envelope with CRLF line endings", () => {
    const document = buildIcsCalendar({ events: [makeEvent()], generatedAt: STAMP });
    const lines = unfold(document);

    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines.at(-1)).toBe("END:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines).toContain(`PRODID:${ICS_PROD_ID}`);
    expect(document.endsWith("\r\n")).toBe(true);
    expect(document.includes("\n\n")).toBe(false);
  });

  it("writes each event with UTC start, end and stamp (CR-AC-08)", () => {
    const lines = unfold(buildIcsCalendar({ events: [makeEvent()], generatedAt: STAMP }));

    expect(lines).toContain("BEGIN:VEVENT");
    expect(lines).toContain("DTSTART:20260907T010000Z");
    expect(lines).toContain("DTEND:20260907T023000Z");
    expect(lines).toContain("DTSTAMP:20260901T000000Z");
    expect(lines).toContain("STATUS:CONFIRMED");
    expect(lines).toContain("END:VEVENT");
  });

  it("escapes summary and location, and omits an absent location", () => {
    const withLocation = unfold(
      buildIcsCalendar({
        events: [makeEvent({ summary: "CS101, room 3", location: "Library D; 1F" })],
        generatedAt: STAMP,
      }),
    );
    expect(withLocation).toContain("SUMMARY:CS101\\, room 3");
    expect(withLocation).toContain("LOCATION:Library D\\; 1F");

    const withoutLocation = unfold(
      buildIcsCalendar({ events: [makeEvent({ location: null })], generatedAt: STAMP }),
    );
    expect(withoutLocation.some((line) => line.startsWith("LOCATION:"))).toBe(false);
  });

  it("writes CANCELLED when an event is cancelled", () => {
    const lines = unfold(
      buildIcsCalendar({ events: [makeEvent({ status: "CANCELLED" })], generatedAt: STAMP }),
    );

    expect(lines).toContain("STATUS:CANCELLED");
  });

  it("is deterministic for the same input", () => {
    const first = buildIcsCalendar({ events: [makeEvent()], generatedAt: STAMP });
    const second = buildIcsCalendar({ events: [makeEvent()], generatedAt: STAMP });

    expect(first).toBe(second);
  });

  it("emits no VEVENT for an empty timetable (CR-AC-07)", () => {
    const document = buildIcsCalendar({ events: [], generatedAt: STAMP });

    expect(document).not.toContain("BEGIN:VEVENT");
    expect(document).toContain("END:VCALENDAR");
  });
});

describe("course occurrences to .ics", () => {
  it("turns the timetable into events with stable UIDs (FR-CR-06)", () => {
    const occurrences = expandOccurrences(makeCourse(), TERM_START, {
      from: new Date("2026-09-01T00:00:00.000Z"),
      to: new Date("2026-10-01T00:00:00.000Z"),
    });
    const events = courseOccurrencesToIcsEvents(occurrences);

    expect(events).toHaveLength(2);
    expect(events[0]?.uid).toBe(
      "campus-helper-class-course-1:2026-09-07T01:00:00.000Z@campus-helper",
    );
    expect(events[0]?.summary).toBe("CS101 Database Systems");
    expect(events[0]?.description).toBe("Week 1");
    expect(events[0]?.location).toBe("Library D, 1F");

    // Regenerating the same occurrences must not change the UID, otherwise
    // calendar apps would duplicate the class instead of updating it.
    const again = courseOccurrencesToIcsEvents(
      expandOccurrences(makeCourse(), TERM_START, {
        from: new Date("2026-09-01T00:00:00.000Z"),
        to: new Date("2026-10-01T00:00:00.000Z"),
      }),
    );
    expect(again.map((item) => item.uid)).toEqual(events.map((item) => item.uid));
  });

  it("builds the whole document in one call", () => {
    const document = buildCourseCalendar(
      expandOccurrences(makeCourse(), TERM_START, {
        from: new Date("2026-09-01T00:00:00.000Z"),
        to: new Date("2026-10-01T00:00:00.000Z"),
      }),
      { generatedAt: STAMP },
    );
    const vevents = unfold(document).filter((line) => line === "BEGIN:VEVENT");

    expect(vevents).toHaveLength(2);
    expect(document).toContain("X-WR-CALNAME:Campus Helper timetable");
  });
});
