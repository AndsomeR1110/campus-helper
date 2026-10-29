import type { Space, SpaceBooking } from "@/features/spaces";
import type { BookingItem } from "../types";

export function toSpaceBookingItem(booking: SpaceBooking, space: Space): BookingItem {
  if (booking.spaceId !== space.id) throw new Error("Booking and space must match.");
  return {
    id: `space-${booking.id}`,
    sourceId: booking.id,
    type: "STUDY_SPACE",
    title: `Seat ${space.seat}`,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    location: `${space.building}, floor ${space.floor}`,
    status: booking.status,
    href: `/bookings/space-${encodeURIComponent(booking.id)}`,
  };
}

/** Both sources MUST authenticate and filter on the server before returning data.
 * Wire listOfficeHours through @/features/office-hours/server once it exists.
 * No table access, no client-supplied user id, no fabricated Office Hour records.
 */
export function createBookingsService(sources: {
  listSpaces: () => Promise<BookingItem[]>;
  listOfficeHours: () => Promise<BookingItem[]>;
}) {
  return {
    async listMine() {
      const [spaces, officeHours] = await Promise.all([
        sources.listSpaces(),
        sources.listOfficeHours(),
      ]);
      return [...spaces, ...officeHours].sort(
        (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id),
      );
    },
    async detail(id: string) {
      const items = await this.listMine();
      return items.find((b) => b.id === id) ?? null;
    },
  };
}
