import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { cancelBooking, listMyBookings } from "@/features/office-hours/server";
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
/**
 * Office hour bookings (#24, now available).
 * The office-hours module owns its tables; this adapter only maps its DTO into our local
 * BookingRecord and binds its cancellation mutation, so this page never queries
 * OfficeBooking directly (docs/frontend-architecture.md §4).
 */
const office: BookingSource = {
  async list(actor) {
    const rows = await listMyBookings(actor.id);
    return rows.map((row) => ({
      sourceId: row.id,
      title: `Office Hour · ${row.teacherName}`,
      location: row.location,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      status: row.status,
    }));
  },
  async cancel(actor, id) {
    // Throws ApiError (BOOKING_NOT_FOUND / BOOKING_NOT_CANCELLABLE); the shared handler
    // already maps `status` + `code` errors to 404 / 409.
    await cancelBooking({ bookingId: id, studentId: actor.id });
  },
};

export const bookingsService = createBookingsService({
  actor: currentActor,
  sources: { space: spaces, office },
  now: () => new Date(),
});
