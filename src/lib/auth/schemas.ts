import { z } from "zod";

/**
 * Auth zod schemas — shared by the login / register forms and their route handlers.
 *
 * Kept in `src/lib/auth/` (not in a feature module): authentication is not a
 * feature, and this file must stay free of `server-only` imports so client
 * components can use it for instant validation.
 */

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(60, "Name is too long."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(120),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters."),
  studentNo: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? v : undefined)),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;
