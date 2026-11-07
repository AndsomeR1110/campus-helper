import { NextResponse } from "next/server";

import { created, ok, readJson, toErrorResponse } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { listMyBookings } from "@/features/office-hours/server";
import { createBooking } from "@/features/office-hours/server";
import { createBookingSchema } from "@/features/office-hours";

/**
 * GET /api/office-bookings —— 当前用户的 Office Hour 预约。
 * Member 3 在 feat/unified-bookings 里消费此接口组装 My Bookings。
 * 读取会话 → 按请求执行，不会被 Cache Components 预渲染。
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    return ok({ bookings: await listMyBookings(user.id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/office-bookings —— 学生预约（PG-05 / OH-AC-03）。 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const input = createBookingSchema.parse(await readJson(request));

    const booking = await createBooking({
      slotId: input.slotId,
      studentId: user.id, // 只信会话，不信 body
      reason: input.reason,
    });

    return created({
      id: booking.id,
      status: booking.status,
      slotId: booking.slotId,
      createdAt: booking.createdAt.toISOString(),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
