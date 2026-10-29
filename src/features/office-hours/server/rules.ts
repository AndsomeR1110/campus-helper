import { MAX_SLOT_MINUTES, MIN_SLOT_MINUTES } from "@/features/office-hours/constants";

/**
 * 纯函数业务规则 —— 不碰数据库，便于单元测试。
 * 测试命名需标注对应 AC 编号（CONTRIBUTING.md §9）。
 */

/** 时段是否已经开始（开始前 0 秒允许，开始后不允许） */
export function isSlotStarted(startsAt: Date, now: Date = new Date()): boolean {
  return startsAt.getTime() <= now.getTime();
}

export function isSlotEnded(endsAt: Date, now: Date = new Date()): boolean {
  return endsAt.getTime() <= now.getTime();
}

/** 是否可以预约：未开始 + 状态 OPEN */
export function canBook(slot: { startsAt: Date; status: string }, now: Date = new Date()): boolean {
  if (slot.status !== "OPEN") return false;
  return !isSlotStarted(slot.startsAt, now);
}

/** 是否可以取消：未开始 + 状态 CONFIRMED */
export function canCancel(
  booking: { status: string; startsAt: Date },
  now: Date = new Date(),
): boolean {
  if (booking.status !== "CONFIRMED") return false;
  return !isSlotStarted(booking.startsAt, now);
}

export type SlotDurationProblem = "TOO_SHORT" | "TOO_LONG" | null;

/** 时段时长校验（OH-AC：时段必须合理） */
export function validateSlotDuration(startsAt: Date, endsAt: Date): SlotDurationProblem {
  const minutes = (endsAt.getTime() - startsAt.getTime()) / 60000;
  if (minutes < MIN_SLOT_MINUTES) return "TOO_SHORT";
  if (minutes > MAX_SLOT_MINUTES) return "TOO_LONG";
  return null;
}

/** 两个时段是否重叠（用于教师新建时段时提示，不阻断） */
export function overlaps(
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date },
): boolean {
  return a.startsAt.getTime() < b.endsAt.getTime() && b.startsAt.getTime() < a.endsAt.getTime();
}

/** 教师搜索：关键词小写后匹配 name / department / keywords 任一 */
export function matchesKeyword(
  teacher: { displayName: string; department: string; keywords: string[] },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [teacher.displayName, teacher.department, ...teacher.keywords]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}
