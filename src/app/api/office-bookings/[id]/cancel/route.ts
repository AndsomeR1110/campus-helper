import { NextResponse } from "next/server";

import { ok, toErrorResponse } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { cancelBooking } from "@/features/office-hours/server";

/**
 * POST /api/office-bookings/[id]/cancel —— 学生取消自己的预约（OH-AC-05）。
 *
 * 动作式接口：不提供 `PATCH { status: "CANCELLED" }`，状态由服务端决定。
 * 只能取消本人的预约；取消他人的预约按 404 处理，避免探测。
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await params;

    const booking = await cancelBooking({ bookingId: id, studentId: user.id });

    return ok({
      id: booking.id,
      status: booking.status,
      cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
