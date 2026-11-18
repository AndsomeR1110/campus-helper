import type { RoomRules, Slot } from "./types";

/** "08:30" → 510 */
export const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
/** 510 → "08:30" */
export const fromMinutes = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** "1 h 30 min" */
export function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ") || "0 min";
}

/**
 * Lengths that fit from `start`: within the school's min/max, on the booking
 * step, before closing time and over free slots only.
 */
export function durationOptions(slots: readonly Slot[], start: string, rules: RoomRules) {
  const free = new Set(slots.filter((s) => s.available).map((s) => toMinutes(s.start)));
  const begin = toMinutes(start);
  const close = toMinutes(rules.closesAt);
  const options: number[] = [];
  for (let len = rules.stepMinutes; len <= rules.maxMinutes; len += rules.stepMinutes) {
    const lastStep = begin + len - rules.stepMinutes;
    if (begin + len > close || !free.has(lastStep)) break;
    if (len >= rules.minMinutes) options.push(len);
  }
  return options;
}

/** Free start times that allow at least the minimum booking length. */
export function startOptions(slots: readonly Slot[], rules: RoomRules) {
  return slots.filter((s) => s.available && durationOptions(slots, s.start, rules).length > 0);
}

export type MemberIssue = "EMPTY" | "FORMAT" | "SELF" | "DUPLICATE";

const MEMBER_ID = /^\d{5,12}$/;

/** Problems with each member entry; the booker counts once and is never re-entered. */
export function memberIssues(
  ids: readonly string[],
  selfId: string | null,
): (MemberIssue | null)[] {
  const seen = new Set<string>();
  return ids.map((raw) => {
    const id = raw.trim();
    if (!id) return "EMPTY";
    if (!MEMBER_ID.test(id)) return "FORMAT";
    if (selfId && id === selfId) return "SELF";
    if (seen.has(id)) return "DUPLICATE";
    seen.add(id);
    return null;
  });
}

export const MEMBER_ISSUE_TEXT: Record<MemberIssue, string> = {
  EMPTY: "Enter a student ID or remove this member.",
  FORMAT: "Student IDs contain digits only.",
  SELF: "You’re already counted. Add someone else.",
  DUPLICATE: "This member is already added.",
};

/** Party size including the booker. */
export const partySize = (memberIds: readonly string[]) => memberIds.length + 1;

export function partyIssue(memberIds: readonly string[], rules: RoomRules): string | null {
  const size = partySize(memberIds);
  if (size < rules.minPeople)
    return `Add ${rules.minPeople - size} more ${rules.minPeople - size === 1 ? "member" : "members"}. Rooms need at least ${rules.minPeople} people including you.`;
  if (size > rules.maxPeople)
    return `Rooms allow up to ${rules.maxPeople} people including you. Remove ${size - rules.maxPeople}.`;
  return null;
}

/** Plain-language rule lines for the confirmation step. */
export function ruleLines(rules: RoomRules) {
  const lines = [
    `${rules.minPeople}–${rules.maxPeople} people, including you`,
    `${formatMinutes(rules.minMinutes)} to ${formatMinutes(rules.maxMinutes)} per booking`,
    `Open ${rules.opensAt}–${rules.closesAt}`,
    rules.maxDaysAhead === 0
      ? "Book for today only"
      : `Book up to ${rules.maxDaysAhead} ${rules.maxDaysAhead === 1 ? "day" : "days"} ahead`,
  ];
  if (rules.noShowMinutes)
    lines.push(`Released if nobody checks in within ${rules.noShowMinutes} min of the start`);
  return lines;
}

/** Contiguous free time, e.g. ["11:00–12:00", "14:00–18:00"]. */
export function freeRanges(slots: readonly Slot[]) {
  const ranges: string[] = [];
  let open: string | null = null;
  let last = "";
  for (const s of slots) {
    if (s.available) {
      open ??= s.start;
      last = s.end;
    } else if (open) {
      ranges.push(`${open}–${last}`);
      open = null;
    }
  }
  if (open) ranges.push(`${open}–${last}`);
  return ranges;
}
