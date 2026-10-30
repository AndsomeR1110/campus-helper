export type BookingStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED" | "EXPIRED";
export type SeatType = "QUIET" | "DISCUSSION" | "COMPUTER";

export interface Space {
  id: string;
  campus: string;
  building: string;
  floor: number;
  seat: string;
  type: SeatType;
  discussion: boolean;
  capacity: number;
  power: boolean;
}

export interface TimeRange {
  startsAt: string;
  endsAt: string;
}

export interface SpaceBooking extends TimeRange {
  id: string;
  userId: string;
  spaceId: string;
  status: BookingStatus;
}

export interface SpaceFilters extends Partial<TimeRange> {
  building?: string;
  floor?: number;
  type?: SeatType;
}

/** Supplied by a trusted server session adapter, never by request JSON. */
export interface Actor {
  id: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
}
