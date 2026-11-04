import { z } from "zod";
import { ApiError, created, ok, readJson, toErrorResponse } from "@/lib/api";
import { getCurrentUser } from "@/features/courses/server";
import { deleteSubscription, saveSubscription } from "@/features/notifications/server";
import { readVapidKeys } from "@/features/notifications/push";

const subscribeSchema = z
  .object({
    endpoint: z.string().url().max(2000),
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(255),
  })
  .strict();

const unsubscribeSchema = z.object({ endpoint: z.string().url() }).strict();

/** POST /api/push/subscribe — register this browser for push (task #30). */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const subscription = subscribeSchema.parse(await readJson(request));
    await saveSubscription(user.id, subscription);

    return created({ endpoint: subscription.endpoint });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** DELETE /api/push/subscribe — stop pushing to this browser. */
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    const { endpoint } = unsubscribeSchema.parse(await readJson(request));
    await deleteSubscription(user.id, endpoint);

    return ok({ endpoint });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** GET /api/push/subscribe — the VAPID public key the browser needs. */
export async function GET() {
  try {
    const keys = readVapidKeys();
    if (!keys) {
      throw new ApiError("CONFLICT", "Push notifications are not configured on this server.");
    }

    return ok({ publicKey: keys.publicKey });
  } catch (error) {
    return toErrorResponse(error);
  }
}
