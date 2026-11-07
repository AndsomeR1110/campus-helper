import { NextResponse } from "next/server";
import { z } from "zod";

import { ok, readJson, toErrorResponse } from "@/lib/api";
import { requireTeacher } from "@/lib/auth/guards";
import { updateSlotStatus } from "@/features/office-hours/server";

const actionSchema = z.object({ action: z.enum(["CLOSE", "REOPEN"]) });

/**
 * POST /api/office-slots/[id]/status
 *
 * 用「动作」而不是 `PATCH { status }`（CONTRIBUTING.md §6）：
 * 客户端只能表达"关闭/重新开放"这两个意图，不能写任意状态值。
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireTeacher();
    const { id } = await params;
    const { action } = actionSchema.parse(await readJson(request));

    const slot = await updateSlotStatus({
      userId: user.id,
      slotId: id,
      status: action === "CLOSE" ? "CANCELLED" : "OPEN",
    });

    return ok(slot);
  } catch (error) {
    return toErrorResponse(error);
  }
}
