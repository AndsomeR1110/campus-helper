import { dayKey, formatTime } from "@/lib/time";
import { parseSpaceFilters } from "../filters";
import { validateRange } from "./rules";

export type SpaceSearchParams = Record<string, string | string[] | undefined>;
/** Explicit now keeps the default date independent of prerender and host timezone. */
export function resolveSpaceQuery(input: SpaceSearchParams, now: Date) {
  let start = new Date((Math.floor(now.getTime() / 1800000) + 1) * 1800000);
  if (dayKey(start) !== dayKey(new Date(start.getTime() + 3600000))) {
    start = new Date(`${dayKey(new Date(start.getTime() + 3600000))}T00:00:00+08:00`);
  }
  const defaults: Record<string, string> = {
    date: dayKey(start),
    start: formatTime(start),
    end: formatTime(new Date(start.getTime() + 3600000)),
  };
  const params = new URLSearchParams();
  let duplicate = false;
  for (const key of ["date", "start", "end", "building", "floor", "type"]) {
    const value = input[key];
    if (Array.isArray(value)) duplicate = true;
    params.set(key, typeof value === "string" ? value : (defaults[key] ?? ""));
  }
  const parsed = duplicate ? null : parseSpaceFilters(params);
  let error: string | undefined;
  if (!parsed) error = "Choose a valid date, time, floor and seat type.";
  else {
    try {
      validateRange(parsed.range, now);
    } catch (e) {
      error = (e as Error).message;
    }
  }
  return { query: params.toString(), parsed: error ? null : parsed, error };
}
