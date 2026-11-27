import type { AttendanceClass, AttendanceRecord } from "./types";

/** Teacher codes are short; letters and digits only, spaces ignored. */
export function normaliseCode(input: string) {
  return input.replace(/\s+/g, "").toUpperCase();
}

export function codeIssue(input: string): string | null {
  const code = normaliseCode(input);
  if (!code) return "Enter the class code your teacher shows.";
  if (!/^[A-Z0-9]+$/.test(code)) return "Class codes contain letters and numbers only.";
  if (code.length > 16) return "This code is too long. Check it with your teacher.";
  return null;
}

/** Records the school has settled; no further check-in is offered. */
export const isSettled = (record: AttendanceRecord) =>
  record === "PRESENT" || record === "LATE" || record === "ABSENT";

/** Badge status for a class row: the record wins over the window once known. */
export function classBadge(c: AttendanceClass) {
  if (c.record !== "NONE") return c.record;
  return c.window;
}

/** Whether to offer the code entry for this class. */
export const canCheckIn = (c: AttendanceClass) =>
  c.window === "OPEN" && !isSettled(c.record) && c.record !== "PENDING";

/** Classes in time order, open ones first so the action is at the top. */
export function orderClasses(classes: readonly AttendanceClass[]) {
  return [...classes].sort((a, b) => {
    const open = Number(canCheckIn(b)) - Number(canCheckIn(a));
    return open || a.startsAt.localeCompare(b.startsAt);
  });
}
