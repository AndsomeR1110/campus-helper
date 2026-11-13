import type { SyncState } from "./bridge";

/**
 * Presentation model for the school timetable connection page. Pure, so every
 * state the screen can be in is unit-tested without the Android bridge.
 */
export type SyncPhase =
  | "checking" // platform and saved state not known yet
  | "load-error" // saved state could not be read from the server
  | "unsupported" // browser / iOS: cannot connect, may still have saved classes
  | "not-connected" // Android, nothing saved yet
  | "connecting" // first connection running
  | "refreshing" // refresh running, saved classes still shown
  | "synced" // last server save succeeded
  | "attention" // last attempt failed; saved classes (if any) unchanged
  | "cancelled"; // user closed the school window

export type ConnectionStatus =
  | "CONNECTED"
  | "SYNCING"
  | "NOT_CONNECTED"
  | "NEEDS_ATTENTION"
  | "ANDROID_ONLY";

export interface SyncInputs {
  /** null until the client knows the platform. */
  available: boolean | null;
  state: SyncState | null;
  busy: boolean;
  /** Message from `connectionError()` for the last attempt. */
  error: string;
  /** True when the user cancelled the school window (no failure). */
  cancelled: boolean;
  /** Saved state could not be read. */
  loadError: boolean;
}

export const hasSnapshot = (state: SyncState | null) => Boolean(state && state.version > 0);

export function syncPhase(i: SyncInputs): SyncPhase {
  if (i.loadError) return "load-error";
  if (i.available === null || i.state === null) return "checking";
  if (!i.available) return "unsupported";
  if (i.busy) return hasSnapshot(i.state) ? "refreshing" : "connecting";
  if (i.cancelled) return "cancelled";
  if (i.error) return "attention";
  return hasSnapshot(i.state) ? "synced" : "not-connected";
}

export function connectionStatus(phase: SyncPhase, state: SyncState | null): ConnectionStatus {
  switch (phase) {
    case "connecting":
    case "refreshing":
      return "SYNCING";
    case "attention":
      return "NEEDS_ATTENTION";
    case "unsupported":
      return "ANDROID_ONLY";
    case "synced":
      return "CONNECTED";
    default:
      return hasSnapshot(state) ? "CONNECTED" : "NOT_CONNECTED";
  }
}

/** Label for the primary action, or null when the page offers none. */
export function primaryActionLabel(phase: SyncPhase, state: SyncState | null): string | null {
  if (phase === "unsupported" || phase === "checking" || phase === "load-error") return null;
  if (phase === "connecting") return "Connecting…";
  if (phase === "refreshing") return "Refreshing…";
  return hasSnapshot(state) ? "Refresh timetable" : "Connect school account";
}

/** "7 classes" — counts weekly teaching activities, never a hard-coded number. */
export function classCount(count: number) {
  return `${count} ${count === 1 ? "class" : "classes"}`;
}

/**
 * Exact teaching weeks as compact ranges: [1,2,3,5,7,8] → "Weeks 1–3, 5, 7–8".
 * Irregular school patterns are shown as they are, never simplified.
 */
export function formatWeeks(weeks: readonly number[]) {
  const sorted = [...new Set(weeks)].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = start;
  for (const week of [...sorted.slice(1), Number.NaN]) {
    if (week === prev + 1) {
      prev = week;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = prev = week;
  }
  return `${sorted.length === 1 ? "Week" : "Weeks"} ${ranges.join(", ")}`;
}
