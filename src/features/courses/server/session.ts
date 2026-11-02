import "server-only";

import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

/**
 * Temporary session resolver for the Courses module.
 *
 * TODO(Member 4): replace with `getCurrentUser()` from `@/lib/auth` as soon as
 * `feat/auth-and-roles` lands (docs/frontend-architecture.md §9 explicitly
 * allows a stub until then). It reads the seeded demo student from the database
 * — the client never supplies a user id, so the ownership rule in AGENTS.md
 * ("take the user id from the session, never from the request body") still holds.
 */
export interface SessionUser {
  id: string;
  name: string;
}

export async function getCurrentUser(): Promise<SessionUser> {
  const user = await prisma.user.findFirst({
    where: { role: "STUDENT", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  if (!user) {
    throw new ApiError("UNAUTHENTICATED", "Please sign in to manage your courses.");
  }

  return user;
}
