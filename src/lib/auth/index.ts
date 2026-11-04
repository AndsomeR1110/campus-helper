/**
 * 认证模块公开接口（Member 2 提供，供其他模块使用）。
 *
 * 其他模块**只能**从这里 import，不要深层引用 `@/lib/auth/session` 等内部文件。
 * @see docs/frontend-architecture.md §7.3
 */
export {
  getCurrentUser,
  requireUser,
  requireRole,
  requireStudent,
  requireTeacher,
  requireAdmin,
  type CurrentUser,
} from "@/lib/auth/guards";

export {
  SESSION_COOKIE,
  setSessionCookie,
  clearSessionCookie,
  readSession,
  type SessionPayload,
} from "@/lib/auth/session";

export { hashPassword, verifyPassword } from "@/lib/auth/password";
