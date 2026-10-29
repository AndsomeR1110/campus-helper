import "server-only";

/**
 * Office Hour 服务端公开接口。
 * 其他模块（如 Member 4 的统一日程）只能从 `@/features/office-hours/server` 引用。
 * @see docs/frontend-architecture.md §4
 */
export {
  listTeachers,
  listDepartments,
  getTeacherDetail,
  listMyBookings,
  listSlotsForTeacher,
  toScheduleEvents,
} from "@/features/office-hours/server/queries";

export {
  createBooking,
  cancelBooking,
  createSlot,
  updateSlotStatus,
} from "@/features/office-hours/server/mutations";

export {
  isSlotStarted,
  isSlotEnded,
  canBook,
  canCancel,
  validateSlotDuration,
  overlaps,
  matchesKeyword,
} from "@/features/office-hours/server/rules";
