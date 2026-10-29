import type { Space, SpaceBooking } from "../types";

/** DTO matches the proposal in architecture §7.1. Member 4 must confirm the
 * shared type before a Schedule route consumes it. Contains no user identity.
 */
export function toSpaceScheduleEvent(booking: SpaceBooking, space: Space) {
  if (booking.spaceId !== space.id) throw new Error("Booking and space must match.");
  return {
    id: `STUDY_SPACE:${booking.id}`,
    type: "STUDY_SPACE" as const,
    sourceId: booking.id,
    title: `Seat ${space.seat}`,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    location: `${space.building}, floor ${space.floor}`,
    status: booking.status,
    href: `/bookings/space-${encodeURIComponent(booking.id)}`,
  };
}
