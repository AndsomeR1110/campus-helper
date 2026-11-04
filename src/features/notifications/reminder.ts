import type { CourseReminderInput, ReminderNotification } from "./types";

/**
 * Reminder rules (FR-CR-04, CR-AC-05, CR-AC-06, NT-AC-01).
 *
 * The job runs on a schedule, so every function here must be idempotent and
 * deterministic: the same class at the same time must always produce the same
 * `dedupeKey`, whatever the job run.
 */

/**
 * How late the job may still send a reminder. The class must not have started
 * yet, but a job that wakes up a little late should still notify.
 */
export const REMINDER_GRACE_MINUTES = 5;

/** `course:<id>:<startsAt>:<offset>` — unique per class, per offset. */
export function buildReminderDedupeKey(
  courseId: string,
  startsAt: string,
  offsetMinutes: number,
): string {
  return `course:${courseId}:${startsAt}:${offsetMinutes}`;
}

/** "CS101 starts in 15 minutes" — the copy shown on PG-13 and in the toast. */
export function buildReminderNotification(input: CourseReminderInput): ReminderNotification {
  const minutes = input.offsetMinutes;
  const where = input.location ? ` in ${input.location}` : "";

  return {
    title: `${input.courseCode} starts in ${minutes} minutes`,
    body: `${input.courseName}${where}.`,
    href: `/schedule?week=${input.weekNumber}`,
    dedupeKey: buildReminderDedupeKey(input.courseId, input.startsAt, minutes),
  };
}

/**
 * True when `now` is inside the reminder window: at most `offsetMinutes` before
 * the class, and not more than the grace period after it started.
 */
export function isReminderDue(
  startsAt: string,
  offsetMinutes: number,
  now: Date,
  graceMinutes: number = REMINDER_GRACE_MINUTES,
): boolean {
  const startMs = Date.parse(startsAt);
  if (Number.isNaN(startMs)) {
    return false;
  }

  const nowMs = now.getTime();
  const windowStart = startMs - offsetMinutes * 60_000;
  const windowEnd = startMs + graceMinutes * 60_000;

  return nowMs >= windowStart && nowMs <= windowEnd;
}

/** Formats "in 15 minutes" / "in 1 hour" for the notification body. */
export function formatOffset(offsetMinutes: number): string {
  if (offsetMinutes >= 60 && offsetMinutes % 60 === 0) {
    return offsetMinutes === 60 ? "1 hour" : `${offsetMinutes / 60} hours`;
  }

  return `${offsetMinutes} minutes`;
}
