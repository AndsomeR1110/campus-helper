import type { NotificationType } from "@prisma/client";

/**
 * OH-AC-07：教师撤销时段后，给每个被取消预约的学生生成一条站内通知。
 *
 * 这里只构造**内容**（纯函数，方便单测）；写库发生在
 * `withdrawSlot()` 的同一个事务里，保证"取消预约"与"通知"要么都成功、要么都不发生。
 *
 * 消息用 Asia/Shanghai 表达时间，与页面上显示的一致（PRD §时区）。
 */

export type OfficeHourNotification = {
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  dedupeKey: string;
};

export interface SlotCancelledContext {
  slotId: string;
  /** 时段开始时间（UTC）。 */
  startsAt: Date;
  /** 教师展示名，例如 "Prof. Smith"。 */
  teacherName: string;
}

const TIME_ZONE = "Asia/Shanghai";

function formatWhen(startsAt: Date): string {
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(startsAt);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(startsAt);
  return `${date} at ${time}`;
}

/**
 * `dedupeKey` 里带 bookingId：同一个预约只会收到一条撤销通知（Notification.dedupeKey 唯一），
 * 但学生重新预约后再次被取消，会得到一条新的通知，不会被误判成重复。
 */
export function buildSlotCancelledNotification(
  context: SlotCancelledContext,
  bookingId: string,
): OfficeHourNotification {
  const when = formatWhen(context.startsAt);
  return {
    type: "OFFICE_HOUR_CANCELLED",
    title: "Office hour cancelled",
    body: `${context.teacherName} cancelled the office hour on ${when}. Your booking has been cancelled — please book another slot.`,
    href: `/office-hours/${context.slotId}`,
    dedupeKey: `office-slot:${context.slotId}:${bookingId}:cancelled`,
  };
}
