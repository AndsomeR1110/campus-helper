/**
 * Office Hour 模块公开接口（客户端安全）。
 * 服务端查询/写操作请用 `@/features/office-hours/server`；认证相关 schema 在 `@/lib/auth/schemas`。
 * @see docs/frontend-architecture.md §4
 */
export type { TeacherSummary, SlotSummary, BookingSummary } from "@/features/office-hours/types";

export {
  SLOT_CAPACITY,
  MIN_SLOT_MINUTES,
  MAX_SLOT_MINUTES,
  BOOKING_STATUS_LABEL,
  SLOT_STATUS_LABEL,
  OFFICE_HOURS_MESSAGES,
} from "@/features/office-hours/constants";

export {
  createSlotSchema,
  updateSlotStatusSchema,
  createBookingSchema,
  teacherListQuerySchema,
  type CreateSlotInput,
  type CreateBookingInput,
} from "@/features/office-hours/schemas";

export { toDateTimeLocalValue, fromDateTimeLocalValue } from "./datetime-local";

export { TeacherAvatar } from "./components/teacher-avatar";
