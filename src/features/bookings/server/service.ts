import { ApiError } from "@/lib/api";
import type { Actor } from "@/features/spaces";
import { bookingIdSchema } from "../schemas";
import type { BookingItem, BookingKind, BookingListResult, BookingRecord } from "../types";

/** Providers must filter by actor on the server. Office Hour's future adapter
 * calls @/features/office-hours/server listMyBookings(), never its tables.
 * This is a local adapter contract, not a guessed Member 2 service interface.
 */
export interface BookingSource {
  list(actor: Actor): Promise<BookingRecord[]>;
  cancel(actor: Actor, sourceId: string): Promise<void>;
}
export class BookingSourceUnavailable extends Error {
  readonly status = 503;
  readonly code = "BOOKING_SOURCE_UNAVAILABLE";
  constructor() {
    super("This booking service is not connected yet. Please try again later.");
  }
}
export function createBookingsService(deps: {
  actor: () => Promise<Actor | null>;
  sources: Record<BookingKind, BookingSource | null>;
  now: () => Date;
}) {
  async function actor() {
    const user = await deps.actor();
    if (!user) throw new ApiError("UNAUTHENTICATED", "Sign in to view your bookings.");
    return user;
  }
  function item(kind: BookingKind, row: BookingRecord): BookingItem {
    const id = `${kind}-${row.sourceId}`;
    return {
      sourceId: row.sourceId,
      title: row.title,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      location: row.location,
      status: row.status,
      id,
      kind,
      href: `/bookings/${encodeURIComponent(id)}`,
    };
  }
  async function find(id: string, user: Actor) {
    if (!bookingIdSchema.safeParse(id).success) return null;
    const kind = (id.startsWith("space-") ? "space" : "office") as BookingKind;
    const source = deps.sources[kind];
    if (!source) throw new BookingSourceUnavailable();
    const sourceId = id.slice(kind.length + 1);
    const row = (await source.list(user)).find((row) => row.sourceId === sourceId);
    return row ? item(kind, row) : null;
  }
  return {
    async listMine(): Promise<BookingListResult> {
      const user = await actor();
      const kinds: BookingKind[] = ["office", "space"];
      const results = await Promise.all(
        kinds.map(async (kind) => {
          const source = deps.sources[kind];
          if (!source) return { kind, rows: null };
          try {
            return { kind, rows: await source.list(user) };
          } catch (error) {
            if (error instanceof ApiError && [401, 403].includes(error.status)) throw error;
            return { kind, rows: null };
          }
        }),
      );
      return {
        bookings: results
          .flatMap(({ kind, rows }) => (rows ?? []).map((row) => item(kind, row)))
          .sort(
            (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id),
          ),
        unavailable: results.filter((r) => r.rows === null).map((r) => r.kind),
      };
    },
    async detail(id: string) {
      return find(id, await actor());
    },
    async cancel(id: string) {
      const user = await actor();
      const booking = await find(id, user);
      if (!booking) throw new ApiError("NOT_FOUND", "Booking not found.");
      if (booking.status !== "CONFIRMED" || Date.parse(booking.startsAt) <= deps.now().getTime())
        throw new ApiError(
          "BOOKING_NOT_CANCELLABLE",
          "Only confirmed bookings that have not started can be cancelled.",
        );
      await deps.sources[booking.kind]!.cancel(user, booking.sourceId);
    },
  };
}
