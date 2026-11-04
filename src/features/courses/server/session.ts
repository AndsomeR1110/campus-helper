import "server-only";

import { requireUser, type CurrentUser } from "@/lib/auth";

/**
 * Session resolver for the Courses, Schedule and Notifications modules.
 *
 * Delegates to the real auth guard from `@/lib/auth`: returns the signed-in
 * user or throws `UNAUTHENTICATED` (401). The user id always comes from the
 * session cookie, never from the request body.
 */
export type SessionUser = CurrentUser;

export function getCurrentUser(): Promise<SessionUser> {
  return requireUser();
}
