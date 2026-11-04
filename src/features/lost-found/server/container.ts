import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";

import { DEMO_POSTS } from "../demo-data";
import { createMemoryRepository } from "./memory-repository";
import { createPrismaLostFoundRepository } from "./prisma-repository";
import { createLostFoundService, type LostFoundService } from "./service";
import { createDiskImageStorage, type ImageStorage } from "./storage";
import { getCurrentViewer } from "./viewer";

interface LostFoundRuntime {
  service: LostFoundService;
  storage: ImageStorage;
  /** True when the demo data is in use instead of PostgreSQL. */
  demo: boolean;
}

/**
 * Pinned on `globalThis`: the dev server builds one module graph for pages and
 * another for route handlers, so a module-level singleton would hand the two
 * graphs separate memory stores and a write would look lost after a refresh.
 */
const globalStore = globalThis as typeof globalThis & { __lostFoundRuntime?: LostFoundRuntime };

/**
 * Composition root used by pages, route handlers and the admin screen.
 *
 * With `DATABASE_URL` set the module talks to PostgreSQL; without it the demo
 * runs on an in-memory store seeded from `demo-data.ts`, which is what makes
 * `npm run dev` show a populated module on a laptop with no database.
 */
export function getLostFoundRuntime(): LostFoundRuntime {
  const existing = globalStore.__lostFoundRuntime;
  if (existing) return existing;

  const demo = !process.env.DATABASE_URL;
  const repository = demo
    ? createMemoryRepository({ posts: DEMO_POSTS })
    : createPrismaLostFoundRepository(prisma);
  const storage = createDiskImageStorage();

  const service = createLostFoundService({
    repository,
    currentViewer: getCurrentViewer,
    now: () => new Date(),
    nextId: () => randomUUID(),
    storage,
  });

  const runtime: LostFoundRuntime = { service, storage, demo };
  globalStore.__lostFoundRuntime = runtime;
  return runtime;
}
