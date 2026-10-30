/**
 * Demo session stub (temporary).
 *
 * Member 2 owns `src/lib/auth/`. Until `feat/auth-and-roles` lands there is no
 * `getCurrentUser()` / `requireRole()`, so this module returns a fixed viewer
 * built from the demo seed. Swap the two exports for the real ones in the same
 * PR that adds auth; every call site already goes through this module.
 */
import type { Viewer } from "../types";

export const DEMO_VIEWERS = {
  /** The signed-in student: sees their own posts, can claim other students' posts. */
  student: { id: "u-1001", name: "Wei Chen", role: "STUDENT" },
  /** Second student, used for claims and posts the viewer must not see privately. */
  other: { id: "u-1002", name: "Mei Lin", role: "STUDENT" },
  /** Administrator: moderates reports and can read any claim. */
  admin: { id: "u-9001", name: "Duty Officer", role: "ADMIN" },
} as const satisfies Record<string, Viewer>;

export function getViewer(): Viewer {
  return DEMO_VIEWERS.student;
}

/**
 * ADMIN gate for the `/admin` pages and `/api/admin/*` handlers.
 * Throws instead of returning a boolean so a missing check cannot be ignored.
 */
export function requireAdmin(): Viewer {
  const viewer = DEMO_VIEWERS.admin;
  if (viewer.role !== "ADMIN") throw new Error("Admin access required.");
  return viewer;
}
