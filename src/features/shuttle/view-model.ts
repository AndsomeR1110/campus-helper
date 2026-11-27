import type { Schedule, Trip } from "./schemas";

/**
 * Presentation helpers for the shuttle screens. Pure, so the states the UI
 * distinguishes are unit-tested without the Android bridge.
 */
export type Route = 1 | 2;

export const ROUTES: readonly { route: Route; from: string; to: string }[] = [
  { route: 2, from: "Taicang", to: "SIP" },
  { route: 1, from: "SIP", to: "Taicang" },
];

/** Error code from the bridge (`{ code }` from native, or `Error(code)` from the adapter). */
export function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) return String(error.code);
  return error instanceof Error ? error.message : "";
}

/** How the UI should respond to a failed request. */
export type FailureKind = "auth" | "unknown-result" | "stale" | "unavailable" | "busy" | "other";

export function failureKind(error: unknown): FailureKind {
  switch (errorCode(error)) {
    case "AUTH_REQUIRED":
      return "auth";
    case "RESULT_UNKNOWN":
      return "unknown-result";
    case "ALREADY_BOOKED":
    case "NOT_FOUND":
      return "stale";
    case "NATIVE_UNAVAILABLE":
    case "UPDATE_WEBVIEW":
      return "unavailable";
    case "BUSY":
      return "busy";
    default:
      return "other";
  }
}

/** Journey instant in Asia/Shanghai, for the shared time formatters. */
export const journeyStart = (j: Pick<Schedule, "date" | "departure">) =>
  `${j.date}T${j.departure}:00+08:00`;
export const journeyEnd = (j: Pick<Schedule, "date" | "arrival">) =>
  `${j.date}T${j.arrival}:00+08:00`;

/** "1 h 10 min" — journey length from the timetable; null if it does not parse. */
export function journeyDuration(j: Pick<Schedule, "departure" | "arrival">): string | null {
  const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const total = minutes(j.arrival) - minutes(j.departure);
  if (!Number.isFinite(total) || total <= 0) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
}

/** "SIP Campus" → "SIP", for compact route labels. */
export const campusShort = (campus: string) =>
  campus.replace(/ Campus$/, "").replace(/^TC$/, "Taicang");

/**
 * A departure the user already holds, matched on the journey itself: schedule
 * and trip IDs are different school identifiers and must not be compared.
 */
export function heldTrip(schedule: Schedule, trips: readonly Trip[] | null): Trip | undefined {
  return trips?.find(
    (t) =>
      t.date === schedule.date &&
      t.departure === schedule.departure &&
      t.from === schedule.from &&
      t.to === schedule.to,
  );
}

/** Upcoming trips in travel order. */
export const sortTrips = (trips: readonly Trip[]) =>
  [...trips].sort((a, b) => journeyStart(a).localeCompare(journeyStart(b)));
