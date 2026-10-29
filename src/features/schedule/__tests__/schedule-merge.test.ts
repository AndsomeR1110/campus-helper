import { describe, expect, it } from "vitest";
import {
  HIDDEN_SCHEDULE_STATUSES,
  SCHEDULE_TAG_TYPE,
  countEventsByType,
  createScheduleEvent,
  filterEventsInRange,
  getNextEvent,
  getUpcomingEvents,
  groupEventsByDay,
  isVisibleEvent,
  mergeScheduleEvents,
  sortScheduleEvents,
} from "../index";
import type { ScheduleEvent, ScheduleEventSource } from "../index";

function source(overrides: Partial<ScheduleEventSource> = {}): ScheduleEventSource {
  return {
    type: "CLASS",
    sourceId: "occ-1",
    title: "CS101 Database Systems",
    startsAt: "2026-11-03T01:00:00.000Z",
    endsAt: "2026-11-03T02:30:00.000Z",
    location: "Library D, 1F",
    status: "SCHEDULED",
    href: "/courses/cs101",
    ...overrides,
  };
}

function event(overrides: Partial<ScheduleEventSource> = {}): ScheduleEvent {
  return createScheduleEvent(source(overrides));
}

describe("createScheduleEvent", () => {
  it("derives a stable id from the type and the provider record id", () => {
    expect(event().id).toBe("CLASS:occ-1");
    expect(event({ type: "OFFICE_HOUR", sourceId: "ob-9" }).id).toBe("OFFICE_HOUR:ob-9");
    expect(event({ type: "STUDY_SPACE", sourceId: "sb-3" }).id).toBe("STUDY_SPACE:sb-3");
  });
});

describe("sortScheduleEvents", () => {
  it("orders chronologically across the three providers", () => {
    const timeline = mergeScheduleEvents(
      [event({ sourceId: "b", startsAt: "2026-11-03T06:00:00.000Z" })],
      [event({ type: "OFFICE_HOUR", sourceId: "a", startsAt: "2026-11-03T01:00:00.000Z" })],
      [event({ type: "STUDY_SPACE", sourceId: "c", startsAt: "2026-11-04T01:00:00.000Z" })],
    );

    expect(timeline.map((item) => item.id)).toEqual(["OFFICE_HOUR:a", "CLASS:b", "STUDY_SPACE:c"]);
  });

  it("breaks ties by event type, then title", () => {
    const sameInstant = "2026-11-03T01:00:00.000Z";
    const timeline = sortScheduleEvents([
      event({ type: "STUDY_SPACE", sourceId: "s", title: "Seat", startsAt: sameInstant }),
      event({ type: "CLASS", sourceId: "c", title: "Class", startsAt: sameInstant }),
      event({ type: "OFFICE_HOUR", sourceId: "o", title: "Office hour", startsAt: sameInstant }),
    ]);

    expect(timeline.map((item) => item.type)).toEqual(["CLASS", "OFFICE_HOUR", "STUDY_SPACE"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      event({ sourceId: "late", startsAt: "2026-11-05T01:00:00.000Z" }),
      event({ sourceId: "early", startsAt: "2026-11-03T01:00:00.000Z" }),
    ];
    const sorted = sortScheduleEvents(input);

    expect(input[0]?.sourceId).toBe("late");
    expect(sorted[0]?.sourceId).toBe("early");
  });
});

describe("mergeScheduleEvents", () => {
  it("collapses duplicate ids so a refetch cannot double the timeline", () => {
    const timeline = mergeScheduleEvents(
      [event({ sourceId: "same" })],
      [event({ sourceId: "same" })],
    );

    expect(timeline).toHaveLength(1);
  });

  it("keeps every distinct event", () => {
    const timeline = mergeScheduleEvents(
      [event({ sourceId: "a" })],
      [event({ type: "OFFICE_HOUR", sourceId: "b" })],
    );

    expect(timeline).toHaveLength(2);
  });
});

describe("visibility", () => {
  it("hides cancelled and expired events", () => {
    for (const status of HIDDEN_SCHEDULE_STATUSES) {
      expect(isVisibleEvent({ status })).toBe(false);
    }

    expect(isVisibleEvent({ status: "CONFIRMED" })).toBe(true);
    expect(isVisibleEvent({ status: "OPEN" })).toBe(true);
  });
});

describe("getUpcomingEvents / getNextEvent", () => {
  const now = new Date("2026-11-03T00:00:00.000Z");

  it("drops past events and cancelled ones", () => {
    const upcoming = getUpcomingEvents(
      [
        event({ sourceId: "past", startsAt: "2026-11-02T01:00:00.000Z" }),
        event({ sourceId: "cancelled", status: "CANCELLED" }),
        event({ sourceId: "next" }),
      ],
      now,
    );

    expect(upcoming.map((item) => item.sourceId)).toEqual(["next"]);
  });

  it("respects the limit used by the Home Next class card", () => {
    const upcoming = getUpcomingEvents(
      [
        event({ sourceId: "a", startsAt: "2026-11-03T01:00:00.000Z" }),
        event({ sourceId: "b", startsAt: "2026-11-04T01:00:00.000Z" }),
        event({ sourceId: "c", startsAt: "2026-11-05T01:00:00.000Z" }),
      ],
      now,
      2,
    );

    expect(upcoming.map((item) => item.sourceId)).toEqual(["a", "b"]);
  });

  it("returns the single next event, or null when nothing is left", () => {
    expect(getNextEvent([event({ sourceId: "next" })], now)?.sourceId).toBe("next");
    expect(getNextEvent([], now)).toBeNull();
    expect(
      getNextEvent([event({ sourceId: "past", startsAt: "2026-11-01T01:00:00.000Z" })], now),
    ).toBe(null);
  });
});

describe("filterEventsInRange", () => {
  it("keeps events starting inside the range, inclusive on both ends", () => {
    const events = [
      event({ sourceId: "before", startsAt: "2026-11-02T00:00:00.000Z" }),
      event({ sourceId: "from", startsAt: "2026-11-03T00:00:00.000Z" }),
      event({ sourceId: "to", startsAt: "2026-11-09T00:00:00.000Z" }),
      event({ sourceId: "after", startsAt: "2026-11-10T00:00:00.000Z" }),
    ];

    const inRange = filterEventsInRange(
      events,
      new Date("2026-11-03T00:00:00.000Z"),
      new Date("2026-11-09T00:00:00.000Z"),
    );

    expect(inRange.map((item) => item.sourceId)).toEqual(["from", "to"]);
  });
});

describe("groupEventsByDay", () => {
  it("groups by the Asia/Shanghai calendar day, not the UTC day", () => {
    // 15:30 UTC on 3 Nov is 23:30 in Shanghai (same day);
    // 17:00 UTC on 3 Nov is 01:00 on 4 Nov in Shanghai (next day).
    const days = groupEventsByDay([
      event({ sourceId: "late", startsAt: "2026-11-03T15:30:00.000Z" }),
      event({ sourceId: "after-midnight", startsAt: "2026-11-03T17:00:00.000Z" }),
    ]);

    expect(days.map((day) => day.date)).toEqual(["2026-11-03", "2026-11-04"]);
    expect(days[0]?.events[0]?.sourceId).toBe("late");
    expect(days[1]?.events[0]?.sourceId).toBe("after-midnight");
  });

  it("keeps the class before the booking on the same day", () => {
    const days = groupEventsByDay([
      event({ sourceId: "booking", type: "OFFICE_HOUR", startsAt: "2026-11-03T06:00:00.000Z" }),
      event({ sourceId: "class", startsAt: "2026-11-03T01:00:00.000Z" }),
    ]);

    expect(days).toHaveLength(1);
    expect(days[0]?.events.map((item) => item.sourceId)).toEqual(["class", "booking"]);
  });
});

describe("countEventsByType", () => {
  it("counts the three providers for the filter chips", () => {
    const counts = countEventsByType([
      event({ sourceId: "c1" }),
      event({ sourceId: "c2", startsAt: "2026-11-04T01:00:00.000Z" }),
      event({ type: "OFFICE_HOUR", sourceId: "o1" }),
      event({ type: "STUDY_SPACE", sourceId: "s1" }),
    ]);

    expect(counts).toEqual({ CLASS: 2, OFFICE_HOUR: 1, STUDY_SPACE: 1 });
  });
});

describe("SCHEDULE_TAG_TYPE", () => {
  it("maps every event type to a UI tag type (FR-CR-05)", () => {
    expect(SCHEDULE_TAG_TYPE).toEqual({
      CLASS: "class",
      OFFICE_HOUR: "office",
      STUDY_SPACE: "space",
    });
  });
});
