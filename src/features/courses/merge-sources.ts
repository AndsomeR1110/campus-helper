import type { Course } from "./types";
const slot = (c: Course) => `${c.code}|${c.weekday}|${c.startTime}`;
/** Prefer the authoritative school slot in the combined view; manual rows remain editable in storage. */
export function mergeCourseSources(manual: Course[], school: Course[]): Course[] {
  const covered = new Set(school.map(slot));
  return [...manual.filter((c) => !covered.has(slot(c))), ...school];
}
