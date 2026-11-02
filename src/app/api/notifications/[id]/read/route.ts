import { ok, toErrorResponse } from "@/lib/api";
import { getCurrentUser } from "@/features/courses/server";
import { readNotification } from "@/features/notifications/server";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/notifications/[id]/read — the item becomes read when opened. */
export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
    await readNotification(user.id, id);
    return ok({ id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
