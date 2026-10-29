import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * 统一响应与错误工具。
 *
 * 约定（CONTRIBUTING.md §6）：
 *   成功 → { data: ... }
 *   失败 → { error: { code: UPPER_SNAKE_CASE, message, fields? } }
 *
 * @see docs/frontend-architecture.md §2（src/lib/api.ts — Member 1 + Member 2 提案）
 */

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SLOT_NOT_AVAILABLE"
  | "SLOT_ALREADY_BOOKED"
  | "SLOT_ALREADY_STARTED"
  | "BOOKING_NOT_FOUND"
  | "BOOKING_NOT_CANCELLABLE"
  | "EMAIL_ALREADY_REGISTERED"
  | "INVALID_CREDENTIALS"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BOOKING_NOT_FOUND: 404,
  SLOT_NOT_AVAILABLE: 409,
  SLOT_ALREADY_BOOKED: 409,
  SLOT_ALREADY_STARTED: 409,
  BOOKING_NOT_CANCELLABLE: 409,
  EMAIL_ALREADY_REGISTERED: 409,
  INTERNAL_ERROR: 500,
};

/** 业务异常：路由处理器里 throw，再由 toErrorResponse 统一转换。 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly fields?: Record<string, string>;

  constructor(code: ApiErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.fields = fields;
  }

  get status(): number {
    return STATUS_BY_CODE[this.code] ?? 500;
  }
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

export function fail(code: ApiErrorCode, message: string, fields?: Record<string, string>) {
  return NextResponse.json(
    { error: { code, message, ...(fields ? { fields } : {}) } },
    { status: STATUS_BY_CODE[code] ?? 500 },
  );
}

/**
 * 把任意异常转成统一错误响应。
 * 500 不暴露内部信息（CONTRIBUTING.md §6）。
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return fail(error.code, error.message, error.fields);
  }

  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      if (!fields[key]) fields[key] = issue.message;
    }
    return fail("VALIDATION_ERROR", "Some fields are invalid.", fields);
  }

  // Prisma 唯一约束冲突（并发预约的兜底）
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    return fail("SLOT_ALREADY_BOOKED", "This slot has just been booked by someone else.");
  }

  console.error("[api] unhandled error:", error);
  return fail("INTERNAL_ERROR", "Something went wrong. Please try again.");
}

/** 解析 JSON body，body 非法时抛 VALIDATION_ERROR。 */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
}
