import "server-only";

import type { Viewer } from "../types";

/**
 * Session adapter for the module (issue #31, item 1).
 *
 * `feat/auth-and-roles` will replace the two function bodies with the real
 * session lookup. Until then the student viewer is a **local demo** switch and
 * the admin viewer needs a separate opt-in, so the moderation queue is never
 * open by accident.
 *
 * - `LOST_FOUND_DEMO=0`  -> no viewer, every read is public and every write 401
 * - `LOST_FOUND_DEMO_ADMIN=1` -> the `/admin` gate opens for the demo officer
 */
export const DEMO_STUDENT: Viewer = { id: "u-1001", role: "STUDENT", name: "Wei Chen" };
export const DEMO_ADMIN: Viewer = { id: "u-9001", role: "ADMIN", name: "Duty Officer" };

export async function getCurrentViewer(): Promise<Viewer | null> {
  if (process.env.LOST_FOUND_DEMO === "0") return null;
  return DEMO_STUDENT;
}

export async function getCurrentAdmin(): Promise<Viewer | null> {
  if (process.env.LOST_FOUND_DEMO_ADMIN !== "1") return null;
  return DEMO_ADMIN;
}
