import { ok, toErrorResponse } from "@/lib/api";
import { getCurrentUser } from "@/features/courses/server";
import { listForUser } from "@/features/notifications/server";

/** GET /api/notifications — the signed-in student's notifications (PG-13). */
export async function GET() {
  try {
    const user = await getCurrentUser();
    return ok(await listForUser(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
