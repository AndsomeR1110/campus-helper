import type { SeatType } from "./types";

/** User-facing names for seat types; never show the raw enum value. */
export const SEAT_TYPE_LABELS: Record<SeatType, string> = {
  QUIET: "Quiet seat",
  DISCUSSION: "Discussion room",
  COMPUTER: "Computer seat",
};

export const SEAT_TYPES = Object.keys(SEAT_TYPE_LABELS) as SeatType[];
