import "server-only";

import type { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { readSession } from "@/lib/auth/session";

/**
 * 服务端身份与权限校验。
 *
 * 原则（CONTRIBUTING.md §6）：
 *   - 用户 ID 只从会话里取，绝不接受客户端传入的 userId
 *   - 权限在**服务端**检查；前端隐藏按钮不算权限
 *   - 页面、查询函数、接口三处都要检查，Proxy 只做快速跳转
 */

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** 取当前登录用户；未登录或用户已停用返回 null。 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await readSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** 要求已登录；否则抛 401。 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("UNAUTHENTICATED", "Please sign in to continue.");
  return user;
}

/** 要求指定角色之一；已登录但角色不符抛 403。 */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new ApiError("FORBIDDEN", "You do not have permission to perform this action.");
  }
  return user;
}

export const requireStudent = () => requireRole("STUDENT", "TEACHER", "ADMIN");
export const requireTeacher = () => requireRole("TEACHER", "ADMIN");
export const requireAdmin = () => requireRole("ADMIN");
