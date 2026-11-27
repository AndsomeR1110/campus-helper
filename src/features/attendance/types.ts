/**
 * PROPOSED UI contract for AMS class check-in — not implemented yet.
 *
 * Codex owns the AMS adapter and will publish the real facade. A class code
 * is the short code a teacher shows in class; it is never the student's
 * account password. Submitting a code changes the attendance record, so it
 * must never be prefetched or retried automatically.
 */

/** Whether the school currently accepts a code for this class. */
export type CheckInWindow = "NOT_OPEN" | "OPEN" | "CLOSED";

/** The student's record as read back from AMS. */
export type AttendanceRecord = "NONE" | "PENDING" | "PRESENT" | "LATE" | "ABSENT";

export interface AttendanceClass {
  id: string;
  moduleCode: string;
  name: string;
  /** ISO 8601, UTC. */
  startsAt: string;
  endsAt: string;
  location: string | null;
  window: CheckInWindow;
  record: AttendanceRecord;
  /** ISO time the school recorded the check-in, when known. */
  recordedAt: string | null;
}

export type CheckInOutcome =
  | { kind: "recorded"; record: "PRESENT" | "LATE"; recordedAt: string }
  | { kind: "pending" }
  | { kind: "wrong-code"; message?: string }
  | { kind: "not-open" }
  | { kind: "closed" }
  | { kind: "unknown" }
  | { kind: "auth" };
