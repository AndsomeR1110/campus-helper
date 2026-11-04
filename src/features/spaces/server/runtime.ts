import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import type { Actor } from "../types";
import { createSpaceHandlers } from "./handlers";
import { createPrismaSpaceRepository } from "./repository";
import { createSpaceService } from "./service";

/** Temporary demo identity explicitly allowed by issue #26, not authentication.
 * TODO(M3): replace ONLY this resolver with @/lib/auth when auth-and-roles merges.
 * The browser cannot choose an actor; missing/inactive demo accounts fail closed.
 */
export async function getCurrentSpaceActor(): Promise<Actor | null> {
  await connection();
  const user = await prisma.user.findUnique({
    where: { email: "student.mia@campus-helper.demo" },
    select: { id: true, role: true, isActive: true },
  });
  return user?.isActive && user.role === "STUDENT" ? { id: user.id, role: user.role } : null;
}
export const spaceService = createSpaceService({
  repository: createPrismaSpaceRepository(prisma),
  currentActor: getCurrentSpaceActor,
  now: () => new Date(),
});
export const spaceHandlers = createSpaceHandlers(spaceService);
