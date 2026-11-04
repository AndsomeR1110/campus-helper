import type { BookingStatus } from "@/features/spaces";
export type BookingKind = "office" | "space";
/** Module-local view model. This does not define Member 2's BookingSummary. */
export interface BookingRecord {
  sourceId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  status: BookingStatus;
}
export interface BookingItem extends BookingRecord {
  id: string;
  kind: BookingKind;
  href: string;
}
export interface BookingListResult {
  bookings: BookingItem[];
  unavailable: BookingKind[];
}
