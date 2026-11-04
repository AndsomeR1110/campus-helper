import "server-only";

import { prisma } from "@/lib/db";
import { isExpiredSubscription, readVapidKeys, sendPush, type PushResult } from "../push";

export interface SubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Registers or refreshes one browser subscription. */
export async function saveSubscription(userId: string, input: SubscriptionInput): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: { userId, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth },
    update: { userId, p256dh: input.p256dh, auth: input.auth, lastSeenAt: new Date() },
  });
}

/** Removes a subscription; scoped to the owner so one user cannot delete another's. */
export async function deleteSubscription(userId: string, endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

/**
 * Sends a payload-less push to every device of the given users and prunes the
 * subscriptions the push service reports as gone (404/410/403).
 */
export async function dispatchPush(userIds: string[], now: Date): Promise<PushResult[]> {
  const keys = readVapidKeys();
  if (!keys || userIds.length === 0) {
    return [];
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: [...new Set(userIds)] } },
  });

  const results = await Promise.all(
    subscriptions.map((subscription) =>
      sendPush(
        { endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth: subscription.auth },
        keys,
        now,
      ).catch(() => ({ endpoint: subscription.endpoint, ok: false, status: 0 })),
    ),
  );

  const expired = results.filter(isExpiredSubscription).map((result) => result.endpoint);
  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: expired } } });
  }

  return results;
}
