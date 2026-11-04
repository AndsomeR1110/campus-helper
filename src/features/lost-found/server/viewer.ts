import "server-only";

import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth";

import type { Viewer } from "../types";

/**
 * Session adapter for the module (issue #31, item 1).
 *
 * `feat/auth-and-roles` will replace the two function bodies with the real
 * session lookup. Until then the viewer comes from a **local demo** switch and
 * the admin viewer needs a separate opt-in, so the moderation queue is never
 * open by accident.
 *
 * - `LOST_FOUND_DEMO=0`       -> no viewer, every read is public and every write 401
 * - `LOST_FOUND_DEMO_ADMIN=1` -> the `/admin` gate opens for the demo officer
 * - cookie `lost_found_viewer` -> which demo person this browser acts as
 *
 * The cookie exists so one machine can play two people: the end-to-end test in
 * `tests/e2e/lost-found.spec.ts` uses it to publish as one student and claim as
 * another. It is read only in demo mode and disappears once a real session
 * exists.
 */
export const DEMO_VIEWER_COOKIE = "lost_found_viewer";

export const DEMO_STUDENT: Viewer = { id: "u-1001", role: "STUDENT", name: "Wei Chen" };
export const DEMO_OTHER_STUDENT: Viewer = { id: "u-1002", role: "STUDENT", name: "Mei Lin" };
export const DEMO_TEACHER: Viewer = { id: "u-8001", role: "TEACHER", name: "Ada Zhou" };
export const DEMO_ADMIN: Viewer = { id: "u-9001", role: "ADMIN", name: "Duty Officer" };

const DEMO_PEOPLE: Record<string, Viewer> = {
  wei: DEMO_STUDENT,
  mei: DEMO_OTHER_STUDENT,
  teacher: DEMO_TEACHER,
  admin: DEMO_ADMIN,
};

/**
 * With a database the viewer is the signed-in user from `@/lib/auth`; the demo
 * cookie below is only honoured by the in-memory demo (no `DATABASE_URL`), so a
 * browser can never choose who it acts as against real data.
 */
const usesRealSession = () => Boolean(process.env.DATABASE_URL);

async function sessionViewer(): Promise<Viewer | null> {
  const user = await getCurrentUser();
  return user ? { id: user.id, role: user.role, name: user.name } : null;
}

export async function getCurrentViewer(): Promise<Viewer | null> {
  if (usesRealSession()) return sessionViewer();
  if (process.env.LOST_FOUND_DEMO === "0") return null;

  const jar = await cookies();
  const chosen = jar.get(DEMO_VIEWER_COOKIE)?.value;
  const person = chosen === undefined ? undefined : DEMO_PEOPLE[chosen];
  return person ?? DEMO_STUDENT;
}

export async function getCurrentAdmin(): Promise<Viewer | null> {
  if (usesRealSession()) {
    const viewer = await sessionViewer();
    return viewer?.role === "ADMIN" ? viewer : null;
  }
  if (process.env.LOST_FOUND_DEMO_ADMIN !== "1") return null;

  const jar = await cookies();
  return jar.get(DEMO_VIEWER_COOKIE)?.value === "admin" ? DEMO_ADMIN : null;
}
