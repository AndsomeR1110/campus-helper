import { MAX_WEEK, MIN_WEEK, SHANGHAI_UTC_OFFSET_MINUTES } from "./constants";
import { assertTermStart, toUtcInstant, weekdayIndex } from "./rules";
import type { Course, CourseOccurrence } from "./types";

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/** Both ends are inclusive. */
export interface DateRange {
  from: Date;
  to: Date;
}

/** One day of the week view, keyed by the Asia/Shanghai calendar date. */
export interface OccurrenceDay {
  /** "YYYY-MM-DD" in Asia/Shanghai. */
  date: string;
  occurrences: CourseOccurrence[];
}

/**
 * True when the course runs in that teaching week: inside the week bounds and
 * matching the odd / even pattern (FR-CR-01 "Teaching Weeks").
 */
export function isWeekActive(
  course: Pick<Course, "firstWeek" | "lastWeek" | "weekParity">,
  weekNumber: number,
): boolean {
  if (weekNumber < course.firstWeek || weekNumber > course.lastWeek) {
    return false;
  }

  if (course.weekParity === "ODD") {
    return weekNumber % 2 === 1;
  }

  if (course.weekParity === "EVEN") {
    return weekNumber % 2 === 0;
  }

  return true;
}

/** Every teaching week the course actually runs in, clamped to the term. */
export function listActiveWeeks(
  course: Pick<Course, "firstWeek" | "lastWeek" | "weekParity">,
): number[] {
  const first = Math.max(MIN_WEEK, course.firstWeek);
  const last = Math.min(MAX_WEEK, course.lastWeek);
  const weeks: number[] = [];

  for (let week = first; week <= last; week += 1) {
    if (isWeekActive(course, week)) {
      weeks.push(week);
    }
  }

  return weeks;
}

/**
 * Expands a weekly course rule into dated occurrences inside `range`.
 * Occurrences come back in ascending start order, which is what the week view
 * and the "Next class" card both expect (CR-AC-01).
 */
export function expandOccurrences(
  course: Course,
  termStart: string,
  range: DateRange,
): CourseOccurrence[] {
  assertTermStart(termStart);

  const fromMs = range.from.getTime();
  const toMs = range.to.getTime();
  const offset = weekdayIndex(course.weekday);
  const occurrences: CourseOccurrence[] = [];

  for (const week of listActiveWeeks(course)) {
    const dayOffset = (week - 1) * 7 + offset;
    const startsAt = toUtcInstant(termStart, dayOffset, course.startTime);

    if (startsAt.getTime() < fromMs || startsAt.getTime() > toMs) {
      continue;
    }

    const endsAt = toUtcInstant(termStart, dayOffset, course.endTime);
    const isoStart = startsAt.toISOString();

    occurrences.push({
      id: `${course.id}:${isoStart}`,
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      location: course.location,
      startsAt: isoStart,
      endsAt: endsAt.toISOString(),
      weekNumber: week,
    });
  }

  return occurrences.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** All occurrences of a single teaching week (PG-11 week view). */
export function getOccurrencesInWeek(
  course: Course,
  termStart: string,
  weekNumber: number,
): CourseOccurrence[] {
  assertTermStart(termStart);

  if (!isWeekActive(course, weekNumber)) {
    return [];
  }

  const dayOffset = (weekNumber - 1) * 7 + weekdayIndex(course.weekday);
  const startsAt = toUtcInstant(termStart, dayOffset, course.startTime);
  const endsAt = toUtcInstant(termStart, dayOffset, course.endTime);
  const isoStart = startsAt.toISOString();

  return [
    {
      id: `${course.id}:${isoStart}`,
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      location: course.location,
      startsAt: isoStart,
      endsAt: endsAt.toISOString(),
      weekNumber,
    },
  ];
}

/** The next class from `now` onwards, or null when the course has finished. */
export function getNextOccurrence(
  course: Course,
  termStart: string,
  now: Date,
): CourseOccurrence | null {
  const until = new Date(now.getTime() + MAX_WEEK * 7 * MS_PER_DAY);
  const [next] = expandOccurrences(course, termStart, { from: now, to: until });

  return next ?? null;
}

/** Asia/Shanghai calendar date ("YYYY-MM-DD") of a UTC instant. */
export function toLocalDate(isoInstant: string): string {
  const localMs = Date.parse(isoInstant) + SHANGHAI_UTC_OFFSET_MINUTES * MS_PER_MINUTE;

  return new Date(localMs).toISOString().slice(0, 10);
}

/**
 * Groups occurrences by local calendar day for the week view, keeping the
 * chronological order inside each day.
 */
export function groupOccurrencesByDay(occurrences: CourseOccurrence[]): OccurrenceDay[] {
  const days = new Map<string, CourseOccurrence[]>();

  for (const occurrence of [...occurrences].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const date = toLocalDate(occurrence.startsAt);
    const bucket = days.get(date);

    if (bucket) {
      bucket.push(occurrence);
    } else {
      days.set(date, [occurrence]);
    }
  }

  return [...days.entries()].map(([date, items]) => ({ date, occurrences: items }));
}
