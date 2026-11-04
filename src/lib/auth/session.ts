import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import type { Role } from "@prisma/client";

/**
 * 会话方案：无状态 JWT 存在 httpOnly Cookie 里。
 *
 * 为什么不用 Auth.js：
 *   - 团队只有 5 人、单密码登录，不需要 OAuth / 邮件魔法链接
 *   - 依赖越少越好调试；Auth.js v5 在当前 Next 16 上属于 beta 依赖
 *   - Cookie + JWT 全部代码 ~100 行，Demo Day 讲得清楚
 *   （CONTRIBUTING.md §「认证」允许「Auth.js 或等效方案」，本文件即等效方案）
 *
 * 安全要点：
 *   1. httpOnly —— JS 读不到 token
 *   2. sameSite=lax —— 防 CSRF，同时不影响站内跳转
 *   3. secure 仅生产 —— 本地 http 也能跑
 *   4. JWT 只放 sub + role，不放 email/name（改了不会不同步）
 *   5. 角色校验一律在服务端重新读库或验签，不信任前端
 */

export const SESSION_COOKIE = "ch_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 天

export interface SessionPayload {
  sub: string;
  role: Role;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short (need >= 32 chars). Set it in .env.local — see .env.example.",
    );
  }
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------- token

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.role !== "string") return null;
    return { sub: payload.sub, role: payload.role as Role };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- cookie

export async function setSessionCookie(session: SessionPayload): Promise<void> {
  const token = await signSession(session);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/** 读取 cookie 并验签；无会话或 token 失效时返回 null。 */
export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
