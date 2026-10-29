import { z } from "zod";

/**
 * Office Hour 模块的 zod schema —— 前后端共用。
 * 路由处理器用它校验请求体，客户端表单也用它做即时校验。
 * @see CONTRIBUTING.md §6（所有请求体使用 zod 校验）
 */

const isoDateTime = z
  .string()
  .datetime({ offset: true, message: "Must be an ISO 8601 datetime with timezone." });

// ---------------------------------------------------------------- slots

export const createSlotSchema = z
  .object({
    startsAt: isoDateTime,
    endsAt: isoDateTime,
    location: z.string().trim().max(80).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => new Date(v.endsAt).getTime() > new Date(v.startsAt).getTime(), {
    message: "End time must be after start time.",
    path: ["endsAt"],
  });
export type CreateSlotInput = z.infer<typeof createSlotSchema>;

export const updateSlotStatusSchema = z.object({
  status: z.enum(["OPEN", "CANCELLED"]),
});
export type UpdateSlotStatusInput = z.infer<typeof updateSlotStatusSchema>;

// ---------------------------------------------------------------- bookings

export const createBookingSchema = z.object({
  slotId: z.string().min(1, "Slot is required."),
  reason: z.string().trim().max(300, "Reason is too long.").optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// ---------------------------------------------------------------- filters

export const teacherListQuerySchema = z.object({
  q: z.string().trim().max(60).optional(),
  department: z.string().trim().max(60).optional(),
});
export type TeacherListQuery = z.infer<typeof teacherListQuerySchema>;
