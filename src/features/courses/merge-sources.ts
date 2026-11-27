import type { Course } from "./types";
const slot = (c: Pick<Course, "code" | "weekday" | "startTime">) =>
  `${c.code}|${c.weekday}|${c.startTime}`;
/**
 * Prefer the authoritative school slot in the combined view; manual rows remain editable in
 * storage. A hidden manual row's enabled reminder (`reminders`: course id → minutes) carries
 * over to the school course so the user can still see and manage it.
 */
export function mergeCourseSources(
  manual: Course[],
  school: Course[],
  reminders: ReadonlyMap<string, number> = new Map(),
): Course[] {
  const covered = new Set(school.map(slot));
  const reminderBySlot = new Map<string, { courseId: string; offsetMinutes: number }>();
  for (const course of manual) {
    const offsetMinutes = reminders.get(course.id);
    if (
      offsetMinutes !== undefined &&
      covered.has(slot(course)) &&
      !reminderBySlot.has(slot(course))
    )
      reminderBySlot.set(slot(course), { courseId: course.id, offsetMinutes });
  }
  return [
    ...manual.filter((c) => !covered.has(slot(c))),
    ...school.map((c) => {
      const inheritedReminder = reminderBySlot.get(slot(c));
      return inheritedReminder ? { ...c, inheritedReminder } : c;
    }),
  ];
}
