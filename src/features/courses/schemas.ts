import { z } from "zod";

/**
 * API input for PG-12. Business rules (course-code pattern, end before start,
 * week range, reminder options) stay in `rules.ts` so the form and the server
 * share one implementation.
 */
export const courseDraftSchema = z
  .object({
    code: z.string().trim().min(1).max(16),
    name: z.string().trim().min(1).max(80),
    teacher: z.string().trim().max(60).optional(),
    location: z.string().trim().max(60).optional(),
    weekday: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
    startTime: z.string().trim(),
    endTime: z.string().trim(),
    firstWeek: z.coerce.number().int(),
    lastWeek: z.coerce.number().int(),
    weekParity: z.enum(["ALL", "ODD", "EVEN"]).default("ALL"),
    reminderOffsetMinutes: z.coerce.number().int().nullable().default(null),
  })
  .strict();

export type CourseDraftInput = z.infer<typeof courseDraftSchema>;
