/**
 * Date/time display helpers (ui-ux-spec §7.2). All output is in Asia/Shanghai,
 * regardless of the server's or browser's own time zone. Components must use
 * these instead of formatting dates themselves.
 *
 * Inputs accept a Date or an ISO 8601 string (as returned by the API).
 *
 * Relative helpers (formatRelativeDay, formatDateTimeRange, formatRelativeTime)
 * default `now` to the current time. With Cache Components, reading the current
 * time during prerendering fails the build, so call them from a component that
 * renders at request time (inside <Suspense>, after reading the session or
 * calling `connection()`), or pass `now` explicitly.
 */

export const APP_TIME_ZONE = "Asia/Shanghai";

type DateInput = Date | string;

function toDate(value: DateInput) {
  return typeof value === "string" ? new Date(value) : value;
}

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

interface ZonedParts {
  weekday: string;
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
}

/** Assemble from parts so output is identical across browsers and Node. */
function zonedParts(value: DateInput): ZonedParts {
  const parts: Partial<ZonedParts> = {};
  for (const { type, value: v } of partsFormatter.formatToParts(toDate(value))) {
    if (type in { weekday: 1, day: 1, month: 1, year: 1, hour: 1, minute: 1 }) {
      parts[type as keyof ZonedParts] = v;
    }
  }
  // "Sept" appears in some ICU versions; the spec uses three-letter months.
  parts.month = parts.month!.slice(0, 3);
  return parts as ZonedParts;
}

/** Calendar day key (yyyy-mm-dd) in the app time zone, for same-day comparisons. */
export function dayKey(value: DateInput) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(toDate(value));
}

/** "Mon 3 Nov" */
export function formatDate(value: DateInput) {
  const p = zonedParts(value);
  return `${p.weekday} ${p.day} ${p.month}`;
}

/** "3 Nov 2026" */
export function formatDateWithYear(value: DateInput) {
  const p = zonedParts(value);
  return `${p.day} ${p.month} ${p.year}`;
}

/** "14:00" */
export function formatTime(value: DateInput) {
  const p = zonedParts(value);
  return `${p.hour}:${p.minute}`;
}

/** "14:00–16:00" (en dash) */
export function formatTimeRange(start: DateInput, end: DateInput) {
  return `${formatTime(start)}–${formatTime(end)}`;
}

/**
 * "Mon 3 Nov, 14:00–16:00", or "Today, 14:00–16:00" / "Tomorrow, …"
 * relative to `now`.
 */
export function formatDateTimeRange(start: DateInput, end: DateInput, now: DateInput = new Date()) {
  return `${formatRelativeDay(start, now)}, ${formatTimeRange(start, end)}`;
}

/** "Today", "Tomorrow", otherwise "Mon 3 Nov". */
export function formatRelativeDay(value: DateInput, now: DateInput = new Date()) {
  const target = dayKey(value);
  if (target === dayKey(now)) return "Today";
  const tomorrow = new Date(toDate(now).getTime() + 24 * 60 * 60 * 1000);
  if (target === dayKey(tomorrow)) return "Tomorrow";
  return formatDate(value);
}

/**
 * Notification timestamps: "Just now", "5 min ago", "3 h ago" within a day,
 * then falls back to formatDate().
 */
export function formatRelativeTime(value: DateInput, now: DateInput = new Date()) {
  const diffMs = toDate(now).getTime() - toDate(value).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatDate(value);
}

/** "Good morning" (05:00–11:59), "Good afternoon" (12:00–17:59) or "Good evening", in the app time zone. */
export function formatGreeting(now: DateInput) {
  const hour = Number(zonedParts(now).hour);
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}
