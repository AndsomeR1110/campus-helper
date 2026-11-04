import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { ApiError, ok, toErrorResponse, readJson } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/schemas";

/**
 * Hash compared against when the email is unknown, so a missing account takes
 * as long as a wrong password and response time does not reveal which emails
 * are registered.
 */
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword("campus-helper-timing-guard"));

/**
 * 登录（PG-01 / AUTH-AC-02）。
 *
 * 安全：邮箱不存在与密码错误返回**同一个** 401，避免账号枚举。
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJson(request);
    const input = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, name: true, role: true, passwordHash: true, isActive: true },
    });

    const genericError = new ApiError("INVALID_CREDENTIALS", "Email or password is incorrect.");

    const valid = await verifyPassword(
      input.password,
      user?.passwordHash ?? (await getDummyHash()),
    );
    if (!user || !user.isActive || !valid) throw genericError;

    await setSessionCookie({ sub: user.id, role: user.role });

    return ok({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error) {
    return toErrorResponse(error);
  }
}
