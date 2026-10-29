import {
  COURSE_CODE_PATTERN,
  MAX_COURSE_NAME_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_TEACHER_LENGTH,
  MAX_WEEK,
  MIN_WEEK,
  REMINDER_OFFSET_MINUTES,
  SHANGHAI_UTC_OFFSET_MINUTES,
  WEEKDAYS,
  WEEK_PARITIES,
} from "./constants";
import type {
  Course,
  CourseDraft,
  CourseDraftField,
  CourseValidationError,
  CourseValidationResult,
} from "./types";

const MS_PER_MINUTE = 60_000;

export interface ParsedTime {
  hours: number;
  minutes: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Parses "YYYY-MM-DD" and rejects impossible dates such as 2026-02-31. */
export function parseDateOnly(value: string): { year: number; month: number; day: number } {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Invalid date "${value}", expected YYYY-MM-DD`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));

  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date "${value}", it does not exist in the calendar`);
  }

  return { year, month, day };
}

/** Parses "HH:mm" in 24-hour form, e.g. "09:00" or "14:30". */
export function parseLocalTime(value: string): ParsedTime {
  const match = TIME_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Invalid time "${value}", expected HH:mm`);
  }

  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

export function tryParseLocalTime(value: string): ParsedTime | null {
  try {
    return parseLocalTime(value);
  } catch {
    return null;
  }
}

/** True when the given "YYYY-MM-DD" is a Monday (teaching week 1 always is). */
export function isMonday(value: string): boolean {
  const { year, month, day } = parseDateOnly(value);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 1;
}

export function assertTermStart(value: string): void {
  if (!isMonday(value)) {
    throw new Error(`Term start must be a Monday, received "${value}"`);
  }
}

/**
 * Converts a term start date, an offset in days and a local wall-clock time
 * into the UTC instant used for storage (CONTRIBUTING §7: store UTC, display
 * in Asia/Shanghai).
 */
export function toUtcInstant(termStart: string, dayOffset: number, time: string): Date {
  const { year, month, day } = parseDateOnly(termStart);
  const { hours, minutes } = parseLocalTime(time);
  const localAsUtc = Date.UTC(year, month - 1, day + dayOffset, hours, minutes);

  return new Date(localAsUtc - SHANGHAI_UTC_OFFSET_MINUTES * MS_PER_MINUTE);
}

export function weekdayIndex(weekday: Course["weekday"]): number {
  const index = WEEKDAYS.indexOf(weekday);
  if (index < 0) {
    throw new Error(`Unknown weekday "${weekday}"`);
  }

  return index;
}

/** Class length in minutes, derived from the local wall-clock times. */
export function durationMinutes(course: Pick<Course, "startTime" | "endTime">): number {
  const start = parseLocalTime(course.startTime);
  const end = parseLocalTime(course.endTime);

  return end.hours * 60 + end.minutes - (start.hours * 60 + start.minutes);
}

/**
 * Validates the course editor form (PG-12). Returns every problem at once so
 * the form can highlight all offending fields in a single pass.
 */
export function validateCourseDraft(draft: CourseDraft): CourseValidationResult {
  const errors: CourseValidationError[] = [];

  const push = (field: CourseDraftField | "general", code: string, message: string): void => {
    errors.push({ field, code, message });
  };

  const code = draft.code.trim().toUpperCase();
  if (!COURSE_CODE_PATTERN.test(code)) {
    push("code", "COURSE_CODE_INVALID", "Course code must look like CPT203 or ENT207TC.");
  }

  const name = draft.name.trim();
  if (name.length === 0) {
    push("name", "COURSE_NAME_REQUIRED", "Course name is required.");
  } else if (name.length > MAX_COURSE_NAME_LENGTH) {
    push(
      "name",
      "COURSE_NAME_TOO_LONG",
      `Course name must be at most ${MAX_COURSE_NAME_LENGTH} characters.`,
    );
  }

  if (draft.teacher.trim().length > MAX_TEACHER_LENGTH) {
    push(
      "teacher",
      "TEACHER_TOO_LONG",
      `Teacher name must be at most ${MAX_TEACHER_LENGTH} characters.`,
    );
  }

  if (draft.location.trim().length > MAX_LOCATION_LENGTH) {
    push(
      "location",
      "LOCATION_TOO_LONG",
      `Location must be at most ${MAX_LOCATION_LENGTH} characters.`,
    );
  }

  if (!WEEKDAYS.includes(draft.weekday)) {
    push("weekday", "WEEKDAY_INVALID", "Pick a weekday for the class.");
  }

  if (!WEEK_PARITIES.includes(draft.weekParity)) {
    push("weekParity", "WEEK_PARITY_INVALID", "Pick a week pattern.");
  }

  const start = tryParseLocalTime(draft.startTime);
  if (!start) {
    push("startTime", "START_TIME_INVALID", "Start time must look like 09:00.");
  }

  const end = tryParseLocalTime(draft.endTime);
  if (!end) {
    push("endTime", "END_TIME_INVALID", "End time must look like 10:30.");
  }

  if (start && end && durationMinutes(draft) <= 0) {
    push("endTime", "END_BEFORE_START", "End time must be after the start time.");
  }

  if (!Number.isInteger(draft.firstWeek) || draft.firstWeek < MIN_WEEK) {
    push("firstWeek", "FIRST_WEEK_INVALID", `The first week must be ${MIN_WEEK} or later.`);
  }

  if (!Number.isInteger(draft.lastWeek) || draft.lastWeek > MAX_WEEK) {
    push("lastWeek", "LAST_WEEK_INVALID", `The last week must be ${MAX_WEEK} or earlier.`);
  }

  if (
    Number.isInteger(draft.firstWeek) &&
    Number.isInteger(draft.lastWeek) &&
    draft.firstWeek > draft.lastWeek
  ) {
    push("lastWeek", "WEEK_RANGE_INVALID", "The last week must not be before the first week.");
  }

  if (
    draft.reminderOffsetMinutes !== null &&
    !REMINDER_OFFSET_MINUTES.includes(
      draft.reminderOffsetMinutes as (typeof REMINDER_OFFSET_MINUTES)[number],
    )
  ) {
    push("reminderOffsetMinutes", "REMINDER_OFFSET_INVALID", "Pick one of the reminder options.");
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
