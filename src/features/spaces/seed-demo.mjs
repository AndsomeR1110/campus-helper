/** CLI only; run with Node >=22.12 after migrations and the shared user seed. */
import { PrismaClient } from "@prisma/client";
import { DEMO_SPACES } from "./demo-data.ts";
const db = new PrismaClient();
try {
  for (const space of DEMO_SPACES)
    await db.space.upsert({ where: { id: space.id }, create: space, update: space });
  console.log(`Seeded ${DEMO_SPACES.length} demo seats.`);
} finally {
  await db.$disconnect();
}
