import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { ApiError, ok, toErrorResponse, readJson } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/schemas";
import { clientIp, createRateLimiter, enforceRateLimit } from "@/lib/rate-limit";

/**
 * Hash compared against when the email is unknown, so a missing account takes
 * as long as a wrong password and response time does not reveal which emails
 * are registered.
 */
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword("campus-helper-timing-guard"));

/**
 * Rate limit (PRD 11.3): at most 10 failed attempts per IP + email in 10 minutes.
 * Only *failures* count — a successful sign-in clears the bucket, so a user who
 * mistypes twice and then gets it right is not penalised.
 */
const loginLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

/**
 * 登录（PG-01 / AUTH-AC-02）。
 *
 * 安全：邮箱不存在与密码错误返回**同一个** 401，避免账号枚举。
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJson(request);
    const input = loginSchema.parse(body);

    const limiterKey = `login:${clientIp(request)}:${input.email}`;
    enforceRateLimit(loginLimiter, limiterKey);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, name: true, role: true, passwordHash: true, isActive: true },
    });

    const genericError = new ApiError("INVALID_CREDENTIALS", "Email or password is incorrect.");

    const valid = await verifyPassword(
      input.password,
      user?.passwordHash ?? (await getDummyHash()),
    );

    if (!user || !user.isActive || !valid) {
      loginLimiter.hit(limiterKey);
      throw genericError;
    }

    loginLimiter.reset(limiterKey);
    await setSessionCookie({ sub: user.id, role: user.role });

    return ok({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error) {
    return toErrorResponse(error);
  }
}
