import { NextResponse } from "next/server";

import { ApiError, created, ok, readJson, toErrorResponse } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { getTeacherDetail, listSlotsForTeacher } from "@/features/office-hours/server";
import { createSlot } from "@/features/office-hours/server";
import { createSlotSchema } from "@/features/office-hours";

/**
 * GET /api/office-slots?teacherId=xxx
 *
 * With `teacherId`: returns that teacher's future slots for any signed-in user
 * (client components and Member 3's unified bookings consume this).
 * Without `teacherId`: returns the current teacher's own slots (PG-07 data API).
 *
 * Reading the session forces the handler to run per request — GET handlers are
 * otherwise prerendered under Cache Components (docs/frontend-architecture.md §5.1).
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const teacherId = new URL(request.url).searchParams.get("teacherId");

    if (teacherId) {
      const detail = await getTeacherDetail(teacherId, user.id);
      return ok({ slots: detail?.slots ?? [] });
    }

    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
      throw new ApiError("FORBIDDEN", "Only teachers can list their own slots.");
    }
    return ok({ slots: await listSlotsForTeacher(user.id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/office-slots —— teacher creates a slot (PG-07 / OH-AC-06). */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
      throw new ApiError("FORBIDDEN", "Only teachers can create office hour slots.");
    }

    const input = createSlotSchema.parse(await readJson(request));
    const slot = await createSlot({
      userId: user.id,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location,
      note: input.note,
    });

    return created({ id: slot.id, startsAt: slot.startsAt.toISOString(), status: slot.status });
  } catch (error) {
    return toErrorResponse(error);
  }
}
