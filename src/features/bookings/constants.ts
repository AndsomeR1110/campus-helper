import type { BookingKind } from "./types";
export const BOOKING_LABELS: Record<BookingKind, string> = {
  office: "Office Hour",
  space: "Study space",
};
export const BOOKING_TAGS = { office: "office", space: "space" } as const;
