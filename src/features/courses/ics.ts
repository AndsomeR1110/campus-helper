import type { CourseOccurrence } from "./types";

/**
 * `.ics` (RFC 5545) export for the class timetable (FR-CR-06, CR-AC-08).
 *
 * Times are written as UTC instants (`20260907T010000Z`) instead of a
 * VTIMEZONE block: every calendar application supports UTC, and it removes a
 * whole class of DST / zone-name bugs. `Asia/Shanghai` has no DST anyway.
 */

export const ICS_PROD_ID = "-//Campus Helper//Class Reminder//EN";

export interface IcsEvent {
  /** Globally unique and stable; derivable from the source record. */
  uid: string;
  summary: string;
  description?: string;
  location?: string | null;
  /** ISO 8601 in UTC. */
  startsAt: string;
  endsAt: string;
  status?: "CONFIRMED" | "CANCELLED" | "TENTATIVE";
}

export interface IcsCalendarOptions {
  events: IcsEvent[];
  /**
   * `DTSTAMP` value for every event. Passed explicitly instead of reading the
   * clock so the output is deterministic and prerender-safe.
   */
  generatedAt: Date | string;
  prodId?: string;
  /** Calendar name shown by some clients. */
  calendarName?: string;
}

const CRLF = "\r\n";
/** RFC 5545 §3.1: content lines must not exceed 75 octets. */
const MAX_LINE_OCTETS = 75;

/** Escapes a text value per RFC 5545 §3.3.11. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** "2026-09-07T01:00:00.000Z" -> "20260907T010000Z" */
export function formatIcsUtc(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date supplied to the calendar export: ${String(value)}`);
  }

  const iso = date.toISOString();

  return `${iso.slice(0, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}T${iso.slice(11, 13)}${iso.slice(
    14,
    16,
  )}${iso.slice(17, 19)}Z`;
}

/**
 * Folds a content line at 75 octets (RFC 5545 §3.1). Continuation lines start
 * with a single space. Multi-byte characters are never split.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= MAX_LINE_OCTETS) {
    return line;
  }

  const parts: string[] = [];
  let current = "";
  let currentOctets = 0;

  for (const char of line) {
    const charOctets = encoder.encode(char).length;
    // Continuation lines carry a leading space, so they hold 74 octets of text.
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;

    if (currentOctets + charOctets > limit) {
      parts.push(current);
      current = char;
      currentOctets = charOctets;
    } else {
      current += char;
      currentOctets += charOctets;
    }
  }

  if (current.length > 0) {
    parts.push(current);
  }

  return parts.join(`${CRLF} `);
}

function pushLine(lines: string[], line: string): void {
  lines.push(foldIcsLine(line));
}

function eventLines(event: IcsEvent, stamp: string): string[] {
  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatIcsUtc(event.startsAt)}`,
    `DTEND:${formatIcsUtc(event.endsAt)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  lines.push(`STATUS:${event.status ?? "CONFIRMED"}`, "END:VEVENT");

  return lines;
}

/** Builds a complete `.ics` document. */
export function buildIcsCalendar(options: IcsCalendarOptions): string {
  const stamp = formatIcsUtc(options.generatedAt);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${escapeIcsText(options.prodId ?? ICS_PROD_ID)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  if (options.calendarName) {
    lines.push(`X-WR-CALNAME:${escapeIcsText(options.calendarName)}`);
  }

  for (const event of options.events) {
    lines.push(...eventLines(event, stamp));
  }

  lines.push("END:VCALENDAR");

  const folded: string[] = [];
  for (const line of lines) {
    pushLine(folded, line);
  }

  // Trailing CRLF is required so the last line is terminated.
  return `${folded.join(CRLF)}${CRLF}`;
}

/** Maps timetable occurrences to calendar events with a stable UID per class. */
export function courseOccurrencesToIcsEvents(occurrences: CourseOccurrence[]): IcsEvent[] {
  return occurrences.map((occurrence) => ({
    // Keyed by course + teaching week, not by start time, so the UID survives
    // editing the class time: re-importing updates the event instead of
    // adding a duplicate (CR-AC-03).
    uid: `campus-helper-class-${occurrence.courseId}-w${occurrence.weekNumber}@campus-helper`,
    summary: `${occurrence.courseCode} ${occurrence.courseName}`,
    description: `Week ${occurrence.weekNumber}`,
    location: occurrence.location,
    startsAt: occurrence.startsAt,
    endsAt: occurrence.endsAt,
    status: "CONFIRMED",
  }));
}

/** One-step export used by the route handler: occurrences in, `.ics` document out. */
export function buildCourseCalendar(
  occurrences: CourseOccurrence[],
  options: { generatedAt: Date | string; calendarName?: string },
): string {
  return buildIcsCalendar({
    events: courseOccurrencesToIcsEvents(occurrences),
    generatedAt: options.generatedAt,
    calendarName: options.calendarName ?? "Campus Helper timetable",
  });
}
