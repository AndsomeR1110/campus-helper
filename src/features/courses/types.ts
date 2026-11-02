/**
 * Domain types for the Courses module (Member 4).
 *
 * These types mirror the Prisma models `Course`, `CourseOccurrence` and
 * `ReminderRule` that land with `feat/database-foundation` (Member 2).
 * They are kept framework-free so business rules can be unit tested
 * before the database layer exists (see docs/frontend-architecture.md §9).
 */

export type Weekday =
  "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

/** A course that runs on odd / even weeks is a common XJTLU timetable pattern. */
export type WeekParity = "ALL" | "ODD" | "EVEN";

export interface ReminderRule {
  id: string;
  courseId: string;
  /** Minutes before the occurrence starts: 10, 15, 30 or 60 (FR-CR-04). */
  offsetMinutes: number;
  enabled: boolean;
}

export interface Course {
  id: string;
  /** Owner (student) identifier. */
  ownerId: string;
  /** e.g. "CS101". */
  code: string;
  /** e.g. "Database Systems". */
  name: string;
  /** Teacher name, optional per FR-CR-01. */
  teacher: string | null;
  weekday: Weekday;
  /** "HH:mm" in Asia/Shanghai, local wall-clock time. */
  startTime: string;
  /** "HH:mm" in Asia/Shanghai, local wall-clock time. */
  endTime: string;
  /** Classroom / building, optional. */
  location: string | null;
  /** First teaching week the course runs in, 1-based. */
  firstWeek: number;
  /** Last teaching week the course runs in, 1-based. */
  lastWeek: number;
  weekParity: WeekParity;
}

/**
 * A single dated class. Generated from a `Course` plus the term start date;
 * never stored as a repeating rule.
 */
export interface CourseOccurrence {
  /** `${courseId}:${startsAt}` — stable across regeneration. */
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  location: string | null;
  /** ISO 8601 string in UTC. */
  startsAt: string;
  /** ISO 8601 string in UTC. */
  endsAt: string;
  /** 1-based teaching week number. */
  weekNumber: number;
}

/** Everything the course form collects (FR-CR-01); mirrors the PG-12 field order. */
export interface CourseDraft {
  code: string;
  name: string;
  teacher: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  location: string;
  firstWeek: number;
  lastWeek: number;
  weekParity: WeekParity;
  /** null means reminders are turned off for this course (FR-CR-04). */
  reminderOffsetMinutes: number | null;
}

export type CourseDraftField = keyof CourseDraft;

export interface CourseValidationError {
  field: CourseDraftField | "general";
  /** UPPER_SNAKE_CASE, mirrors the API error codes in CONTRIBUTING §6. */
  code: string;
  message: string;
}

export type CourseValidationResult = { ok: true } | { ok: false; errors: CourseValidationError[] };
