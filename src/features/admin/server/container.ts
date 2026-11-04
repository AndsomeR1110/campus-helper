import { prisma } from "@/lib/db";

import {
  getCurrentAdmin,
  getCurrentViewer,
  getLostFoundRuntime,
} from "@/features/lost-found/server";
import { createMemoryModerationRepository } from "./memory-repository";
import { createPrismaModerationRepository } from "./prisma-repository";
import { createModerationService, type ModerationService } from "./service";
import type { ModerationRepository } from "./repository";

export interface ModerationRuntime {
  service: ModerationService;
  demo: boolean;
}

/** Pinned for the same reason as the lost-found runtime: one process, two module graphs. */
const globalStore = globalThis as typeof globalThis & { __moderationRuntime?: ModerationRuntime };

/**
 * Composition root for the admin page. In demo mode the queue starts from seed
 * data so the reviewer can see a pending report without a database; with
 * `DATABASE_URL` set, the same service runs on Prisma.
 */
export function getModerationRuntime(): ModerationRuntime {
  const existing = globalStore.__moderationRuntime;
  if (existing) return existing;

  const { service: lostFound, demo } = getLostFoundRuntime();
  const repository: ModerationRepository = demo
    ? createMemoryModerationRepository()
    : createPrismaModerationRepository(prisma);

  const runtime: ModerationRuntime = {
    demo,
    service: createModerationService({
      repository,
      lostFound,
      currentViewer: getCurrentViewer,
      currentActor: async () => (await getCurrentAdmin()) ?? (await getCurrentViewer()),
      now: () => new Date(),
      nextId: () => crypto.randomUUID(),
    }),
  };

  globalStore.__moderationRuntime = runtime;
  return runtime;
}
