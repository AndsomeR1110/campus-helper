/**
 * Notification domain types (Member 4, PG-13).
 *
 * Framework-free so the reminder rules can be unit tested without a database
 * (docs/frontend-architecture.md §9).
 */

export type NotificationType = "CLASS_REMINDER";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Deep link the user lands on when they open the notification. */
  href: string;
  /** Idempotency key of the job that produced it. */
  dedupeKey: string;
  /** null while unread. */
  readAt: string | null;
  createdAt: string;
}

/** A notification the reminder job wants to insert. */
export interface ReminderNotification {
  title: string;
  body: string;
  href: string;
  dedupeKey: string;
}

export interface CourseReminderInput {
  courseId: string;
  courseCode: string;
  courseName: string;
  location: string | null;
  /** ISO 8601 in UTC. */
  startsAt: string;
  offsetMinutes: number;
  /** 1-based teaching week, for the deep link. */
  weekNumber: number;
}
