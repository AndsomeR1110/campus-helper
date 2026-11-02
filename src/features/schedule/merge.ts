import { dayKey } from "@/lib/time";

import type { ScheduleDay, ScheduleEvent, ScheduleEventSource, ScheduleEventType } from "./types";

/** Fixed order used to break ties when two events start at the same minute. */
export const SCHEDULE_EVENT_TYPES: readonly ScheduleEventType[] = [
  "CLASS",
  "OFFICE_HOUR",
  "STUDY_SPACE",
] as const;

/**
 * Statuses that must never appear in "upcoming" lists. Everything else is
 * treated as visible, so a provider can add its own statuses without touching
 * this module.
 */
export const HIDDEN_SCHEDULE_STATUSES: readonly string[] = ["CANCELLED", "EXPIRED"] as const;

/** Derives the shared id so providers only pass their own record id. */
export function createScheduleEvent(source: ScheduleEventSource): ScheduleEvent {
  return { ...source, id: `${source.type}:${source.sourceId}` };
}

export function isVisibleEvent(event: Pick<ScheduleEvent, "status">): boolean {
  return !HIDDEN_SCHEDULE_STATUSES.includes(event.status);
}

function typeRank(type: ScheduleEventType): number {
  const rank = SCHEDULE_EVENT_TYPES.indexOf(type);

  return rank < 0 ? SCHEDULE_EVENT_TYPES.length : rank;
}

/** Chronological, with a deterministic tie-break so the UI never jumps around. */
export function compareScheduleEvents(a: ScheduleEvent, b: ScheduleEvent): number {
  const byStart = a.startsAt.localeCompare(b.startsAt);
  if (byStart !== 0) {
    return byStart;
  }

  const byType = typeRank(a.type) - typeRank(b.type);
  if (byType !== 0) {
    return byType;
  }

  return a.title.localeCompare(b.title);
}

export function sortScheduleEvents(events: ScheduleEvent[]): ScheduleEvent[] {
  return [...events].sort(compareScheduleEvents);
}

/**
 * Merges the three providers into one timeline. Duplicate ids (the same record
 * handed over twice, e.g. after a refetch) are collapsed, keeping the first.
 */
export function mergeScheduleEvents(...groups: ScheduleEvent[][]): ScheduleEvent[] {
  const byId = new Map<string, ScheduleEvent>();

  for (const group of groups) {
    for (const event of group) {
      if (!byId.has(event.id)) {
        byId.set(event.id, event);
      }
    }
  }

  return sortScheduleEvents([...byId.values()]);
}

/** Events that start inside [from, to]; both ends are inclusive. */
export function filterEventsInRange(
  events: ScheduleEvent[],
  from: Date,
  to: Date,
): ScheduleEvent[] {
  const fromMs = from.getTime();
  const toMs = to.getTime();

  return events.filter((event) => {
    const startMs = Date.parse(event.startsAt);
    return startMs >= fromMs && startMs <= toMs;
  });
}

/** Events from `now` onwards, cancelled ones removed, optionally capped. */
export function getUpcomingEvents(
  events: ScheduleEvent[],
  now: Date,
  limit?: number,
): ScheduleEvent[] {
  const nowMs = now.getTime();
  const upcoming = sortScheduleEvents(events).filter(
    (event) => isVisibleEvent(event) && Date.parse(event.startsAt) >= nowMs,
  );

  return typeof limit === "number" ? upcoming.slice(0, limit) : upcoming;
}

/** The next visible event, or null when nothing is left. */
export function getNextEvent(events: ScheduleEvent[], now: Date): ScheduleEvent | null {
  const [next] = getUpcomingEvents(events, now, 1);

  return next ?? null;
}

/**
 * Groups a timeline into calendar days using the app time zone, so a class at
 * 23:30 in Shanghai stays on the correct day even when the server runs in UTC.
 */
export function groupEventsByDay(events: ScheduleEvent[]): ScheduleDay[] {
  const days = new Map<string, ScheduleEvent[]>();

  for (const event of sortScheduleEvents(events)) {
    const date = dayKey(event.startsAt);
    const bucket = days.get(date);

    if (bucket) {
      bucket.push(event);
    } else {
      days.set(date, [event]);
    }
  }

  return [...days.entries()].map(([date, items]) => ({ date, events: items }));
}

/** Counts per type, for the schedule page filter chips. */
export function countEventsByType(events: ScheduleEvent[]): Record<ScheduleEventType, number> {
  const counts: Record<ScheduleEventType, number> = {
    CLASS: 0,
    OFFICE_HOUR: 0,
    STUDY_SPACE: 0,
  };

  for (const event of events) {
    counts[event.type] += 1;
  }

  return counts;
}
