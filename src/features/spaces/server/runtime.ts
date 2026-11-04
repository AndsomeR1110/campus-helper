import "server-only";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Actor } from "../types";
import { createSpaceHandlers } from "./handlers";
import { createPrismaSpaceRepository } from "./repository";
import { createSpaceService } from "./service";

/** The signed-in user from `@/lib/auth`; the browser can never choose an actor. */
export async function getCurrentSpaceActor(): Promise<Actor | null> {
  await connection();
  const user = await getCurrentUser();
  return user ? { id: user.id, role: user.role } : null;
}
export const spaceService = createSpaceService({
  repository: createPrismaSpaceRepository(prisma),
  currentActor: getCurrentSpaceActor,
  now: () => new Date(),
});
export const spaceHandlers = createSpaceHandlers(spaceService);
