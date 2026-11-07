/**
 * Office Hour 模块常量与界面文案。
 * 文案集中放这里，便于统一修改（CONTRIBUTING.md §5）。
 */

/** 一个时段默认只能一个人预约。改动需同步调整部分唯一索引，见 docs/database-foundation.md */
export const SLOT_CAPACITY = 1;

/** 时段最短 / 最长时长（分钟） */
export const MIN_SLOT_MINUTES = 10;
export const MAX_SLOT_MINUTES = 120;

/** 单个学生最多可同时持有的有效预约数 */
export const MAX_ACTIVE_BOOKINGS_PER_STUDENT = 20;

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  EXPIRED: "Expired",
};

export const SLOT_STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  CANCELLED: "Withdrawn",
};

export const OFFICE_HOURS_MESSAGES = {
  emptyTeachers: "No teachers match your search. Try a different keyword.",
  emptySlots: "This teacher has no upcoming office hours yet.",
  loginRequired: "Please sign in to book an office hour.",
  bookSuccess: "Booked. You can find it under My Bookings.",
  cancelSuccess: "Booking cancelled.",
  slotAlreadyBooked: "This slot has just been booked by someone else.",
  slotAlreadyStarted: "This slot has already started.",
  bookingNotFound: "Booking not found.",
  networkError: "Network error. Please check your connection and try again.",
} as const;
