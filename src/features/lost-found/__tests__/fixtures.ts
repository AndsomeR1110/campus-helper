import { DEMO_POSTS } from "../demo-data";
import { createMemoryRepository } from "../server/memory-repository";
import { createLostFoundService } from "../server/service";
import type { LostFoundPost, Viewer } from "../types";

/** Fixed clock so `createdAt`, `decidedAt` and the future-date guard are stable. */
export const NOW = new Date("2026-11-04T08:00:00.000Z");

export const wei: Viewer = { id: "u-1001", role: "STUDENT", name: "Wei Chen" };
export const mei: Viewer = { id: "u-1002", role: "STUDENT", name: "Mei Lin" };
export const teacher: Viewer = { id: "u-1003", role: "TEACHER", name: "Ana Silva" };
export const admin: Viewer = { id: "u-9001", role: "ADMIN", name: "Duty Officer" };

export interface Harness {
  service: ReturnType<typeof createLostFoundService>;
  repository: ReturnType<typeof createMemoryRepository>;
  as(next: Viewer | null): void;
}

/** Builds the service with a switchable viewer, exactly like the real session adapter. */
export function makeHarness(
  seed: LostFoundPost[] = DEMO_POSTS,
  viewer: Viewer | null = wei,
): Harness {
  let current = viewer;
  let sequence = 0;
  const repository = createMemoryRepository({ posts: seed });
  const service = createLostFoundService({
    repository,
    currentViewer: async () => current,
    now: () => NOW,
    nextId: () => `id-${++sequence}`,
  });
  return {
    service,
    repository,
    as(next) {
      current = next;
    },
  };
}

/** Minimal Request stand-in for the handler tests. */
export function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/lost-found", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const VALID_POST = {
  kind: "LOST" as const,
  category: "ELECTRONICS" as const,
  title: "Grey notebook",
  description: "A5 notebook with a green elastic band, last seen in the study room.",
  location: "Library, 2nd floor",
  occurredAt: "2026-11-01T09:00:00.000Z",
  image: null,
};
