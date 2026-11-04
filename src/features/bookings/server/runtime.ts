import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createPrismaSpaceRepository, createSpaceService } from "@/features/spaces/server";
import type { Actor } from "@/features/spaces";
import { createBookingsService, type BookingSource } from "./service";

async function currentActor(): Promise<Actor | null> {
  await connection();
  const user = await getCurrentUser();
  return user ? { id: user.id, role: user.role } : null;
}
const repository = createPrismaSpaceRepository(prisma);
const spaces: BookingSource = {
  async list(actor) {
    const [rows, catalog] = await Promise.all([
      repository.listForUser(actor.id),
      repository.listSpaces(),
    ]);
    const byId = new Map(catalog.map((s) => [s.id, s]));
    return rows.map((row) => {
      const seat = byId.get(row.spaceId);
      return {
        sourceId: row.id,
        title: seat ? `Seat ${seat.seat}` : "Study seat",
        location: seat ? `${seat.building}, floor ${seat.floor}` : null,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        status: row.status,
      };
    });
  },
  async cancel(actor, id) {
    await createSpaceService({
      repository,
      currentActor: async () => actor,
      now: () => new Date(),
    }).cancel(id);
  },
};
/** #24 has not published listMyBookings or its cancellation API yet.
 * Leave this source unavailable, not an empty list or direct OfficeBooking query.
 * Once merged, import listMyBookings from @/features/office-hours/server here,
 * map its confirmed DTO into our local BookingRecord and bind its cancel API.
 */
export const bookingsService = createBookingsService({
  actor: currentActor,
  sources: { space: spaces, office: null },
  now: () => new Date(),
});
