import type { SpaceFilters, TimeRange } from "./types";

/** URL input is validated before it reaches a database adapter. No implicit local timezone. */
export function parseSpaceFilters(
  params: URLSearchParams,
): { filters: SpaceFilters; range: TimeRange } | null {
  const date = params.get("date") ?? "";
  const start = params.get("start") ?? "";
  const end = params.get("end") ?? "";
  const floor = params.get("floor") || null;
  const type = params.get("type") || null;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):(00|30)$/.test(start) ||
    !/^([01]\d|2[0-3]):(00|30)$/.test(end) ||
    (floor !== null && !/^[1-9]\d?$/.test(floor)) ||
    (type !== null && !["QUIET", "DISCUSSION", "COMPUTER"].includes(type))
  )
    return null;
  const startsAt = new Date(`${date}T${start}:00+08:00`);
  const endsAt = new Date(`${date}T${end}:00+08:00`);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime())) return null;
  // Reject normalized invalid calendar days (e.g. 30 February).
  if (new Date(startsAt.getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10) !== date)
    return null;
  return {
    filters: {
      building: params.get("building") || undefined,
      floor: floor === null ? undefined : Number(floor),
      type: (type as SpaceFilters["type"]) ?? undefined,
    },
    range: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
  };
}
