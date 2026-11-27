/**
 * UI contract for Taicang discussion rooms, including explicitly enabled native writes.
 *
 * Queries and preflight work in the default review build. Book/cancel require a
 * native build opt-in and explicit confirmation. Unknown results are reconciled
 * through server reads, never retried. Rules come from the school.
 */

/** Booking rules as the school reports them for the current student. */
export interface RoomRules {
  /** Party size including the booker. */
  minPeople: number;
  maxPeople: number;
  minMinutes: number;
  maxMinutes: number;
  /** Booking granularity, e.g. 30. */
  stepMinutes: number;
  /** "HH:mm", Asia/Shanghai. */
  opensAt: string;
  closesAt: string;
  /** 0 = today only. */
  maxDaysAhead: number;
  /** A booking is released if nobody checks in this many minutes after it starts. */
  noShowMinutes: number | null;
}

export interface Floor {
  id: string;
  label: string;
}

export interface Room {
  id: string;
  name: string;
  floorId: string;
  capacity: number | null;
}

export type SlotUnavailableReason = "BOOKED" | "PAST" | "CLOSED";

export interface Slot {
  /** "HH:mm", one booking step long. */
  start: string;
  end: string;
  available: boolean;
  reason?: SlotUnavailableReason;
}

export interface RoomAvailability {
  room: Room;
  slots: Slot[];
}

export type ReservationStatus = "AWAITING" | "CONFIRMED" | "CANCELLED";

export interface Reservation {
  id: string;
  roomName: string;
  floorLabel: string;
  /** yyyy-mm-dd */
  date: string;
  start: string;
  end: string;
  /** Display names only; never full student IDs. */
  members: string[];
  status: ReservationStatus;
  /** Whether the school currently offers cancellation for this reservation. */
  cancellable: boolean;
}

export interface BookingDraft {
  roomId: string;
  date: string;
  start: string;
  minutes: number;
  /** Other members' campus account prefixes, resolved privately by the school. */
  memberIds: string[];
}

/** How a booking request ended, as the UI distinguishes it. */
export type BookingOutcome =
  | { kind: "prepared"; message: string }
  | { kind: "confirmed"; reservation: Reservation }
  | { kind: "awaiting"; reservation: Reservation }
  | { kind: "conflict"; message: string }
  | { kind: "rejected"; message: string }
  | { kind: "unknown" }
  | { kind: "auth" };
