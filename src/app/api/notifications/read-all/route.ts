import { ok, toErrorResponse } from "@/lib/api";
import { getCurrentUser } from "@/features/courses/server";
import { readAll } from "@/features/notifications/server";

/** POST /api/notifications/read-all — mark every notification as read (NT-AC-02). */
export async function POST() {
  try {
    const user = await getCurrentUser();
    return ok({ updated: await readAll(user.id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
