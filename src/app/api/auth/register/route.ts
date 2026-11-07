import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { ApiError, created, toErrorResponse, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { registerSchema } from "@/lib/auth/schemas";
import { clientIp, createRateLimiter, enforceRateLimit } from "@/lib/rate-limit";

/**
 * Rate limit (PRD 11.3): at most 10 registrations per IP in 15 minutes.
 *
 * Keyed by IP only, not IP + email: an attacker who wants many accounts just rotates the
 * address, so keying by email would make the limit meaningless. Every attempt counts
 * (a registration has no "failure" to distinguish).
 *
 * Caveat: a whole campus behind one NAT shares this bucket. 10 per 15 minutes is generous
 * for real sign-ups; raise it here if a demo uses many accounts from one machine.
 */
const registerLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60_000 });

/**
 * 注册（PG-01 / AUTH-AC-01）。
 * 新用户一律创建为 STUDENT —— 客户端不能指定角色。
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJson(request);
    const input = registerSchema.parse(body);

    const limiterKey = `register:${clientIp(request)}`;
    enforceRateLimit(registerLimiter, limiterKey);
    registerLimiter.hit(limiterKey);

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError("EMAIL_ALREADY_REGISTERED", "This email is already registered.", {
        email: "This email is already registered.",
      });
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        studentNo: input.studentNo,
        role: "STUDENT",
      },
      select: { id: true, email: true, name: true, role: true },
    });

    await setSessionCookie({ sub: user.id, role: user.role });
    return created(user);
  } catch (error) {
    return toErrorResponse(error);
  }
}
