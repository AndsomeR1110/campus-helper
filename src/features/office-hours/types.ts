import type { BookingStatus, SlotStatus } from "@prisma/client";

/**
 * Office Hour 模块对外类型。
 * 时间一律 ISO 8601 字符串（UTC），展示前由界面层转 Asia/Shanghai。
 * @see docs/frontend-architecture.md §7.1（预约需可转换为 ScheduleEvent）
 */

export interface TeacherSummary {
  id: string;
  displayName: string;
  department: string;
  office: string | null;
  keywords: string[];
  /** 未来可约时段数量，用于列表页展示 */
  openSlotCount: number;
}

export interface SlotSummary {
  id: string;
  teacherId: string;
  teacherName: string;
  department: string;
  office: string | null;
  startsAt: string;
  endsAt: string;
  status: SlotStatus;
  location: string | null;
  note: string | null;
  /** 该时段当前的有效预约数（0 或 1） */
  bookingCount: number;
  /** 当前用户是否已预约该时段 */
  bookedByMe: boolean;
  /** 是否已经开始（开始后不可预约、不可取消） */
  isPast: boolean;
}

export interface BookingSummary {
  id: string;
  status: BookingStatus;
  reason: string | null;
  createdAt: string;
  cancelledAt: string | null;
  slotId: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  teacherName: string;
  department: string;
}
