import type { Actor, Space, SpaceBooking, SpaceFilters, TimeRange } from "../types";
import {
  assertCanCancel,
  filterSpaces,
  isAvailable,
  overlaps,
  requireActor,
  requireBooker,
  SpaceError,
  validateRange,
} from "./rules";

/**
 * Implemented by Member 3 in repository.ts; Member 2 reviews the schema. A transaction MUST serialize competing
 * writes for BOTH userId and spaceId (including cancellation), or use database
 * exclusion constraints. A process-local mutex is not safe in production.
 */
export interface SpaceTransaction {
  getSpace(id: string): Promise<Space | null>;
  getBooking(id: string): Promise<SpaceBooking | null>;
  findConflicts(userId: string, spaceId: string, range: TimeRange): Promise<SpaceBooking[]>;
  createBooking(input: Omit<SpaceBooking, "id">): Promise<SpaceBooking>;
  cancelBooking(id: string): Promise<SpaceBooking>;
}

export interface SpaceRepository {
  transaction<T>(
    keys: { userId: string; spaceId?: string; bookingId?: string },
    work: (tx: SpaceTransaction) => Promise<T>,
  ): Promise<T>;
  listSpaces(): Promise<Space[]>;
  listConfirmed(range: TimeRange): Promise<SpaceBooking[]>;
  listForUser(userId: string): Promise<SpaceBooking[]>;
}

/** Composition belongs on the server; session and database adapters are required. */
export function createSpaceService(deps: {
  repository: SpaceRepository;
  currentActor: () => Promise<Actor | null>;
  now: () => Date;
}) {
  const { repository, currentActor, now } = deps;
  return {
    async search(filters: SpaceFilters, range: TimeRange) {
      requireActor(await currentActor());
      validateRange(range, now());
      const [spaces, bookings] = await Promise.all([
        repository.listSpaces(),
        repository.listConfirmed(range),
      ]);
      return filterSpaces(spaces, filters).map((space) => ({
        ...space,
        available: isAvailable(space.id, range, bookings),
      }));
    },
    async listMine() {
      const user = requireActor(await currentActor());
      return repository.listForUser(user.id);
    },
    async book(spaceId: string, range: TimeRange) {
      const user = requireBooker(await currentActor());
      return repository.transaction({ userId: user.id, spaceId }, async (tx) => {
        validateRange(range, now());
        if (!(await tx.getSpace(spaceId)))
          throw new SpaceError("NOT_FOUND", "Seat not found.", 404);
        const conflicts = await tx.findConflicts(user.id, spaceId, range);
        if (
          conflicts.some(
            (b) =>
              b.status === "CONFIRMED" &&
              (b.spaceId === spaceId || b.userId === user.id) &&
              overlaps(range, b),
          )
        ) {
          throw new SpaceError(
            "BOOKING_CONFLICT",
            "The seat or your time is already booked. Choose another time or seat.",
            409,
          );
        }
        return tx.createBooking({ ...range, spaceId, userId: user.id, status: "CONFIRMED" });
      });
    },
    async cancel(bookingId: string) {
      const user = requireBooker(await currentActor());
      return repository.transaction({ userId: user.id, bookingId }, async (tx) => {
        const booking = await tx.getBooking(bookingId);
        assertCanCancel(booking, user.id, now());
        return tx.cancelBooking(bookingId);
      });
    },
  };
}
