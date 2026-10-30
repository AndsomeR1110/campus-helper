import type { PrismaClient } from "@prisma/client";
import { DEMO_SPACES } from "../demo-data";

/** Idempotent demo fixtures; invoke from the seed entry after database migrations. */
export async function seedSpaces(db: PrismaClient) {
  for (const space of DEMO_SPACES)
    await db.space.upsert({ where: { id: space.id }, create: space, update: space });
}
