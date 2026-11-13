/**
 * PROPOSED UI contract for Taicang discussion rooms — not implemented yet.
 *
 * Codex owns the school adapter and will publish the real facade. These types
 * describe what the screens need; field names may change when the facade
 * lands. Room rules are always read from the school, never hard-coded.
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
  /** Other members' student IDs; the booker is added by the school. */
  memberIds: string[];
}

/** How a booking request ended, as the UI distinguishes it. */
export type BookingOutcome =
  | { kind: "confirmed"; reservation: Reservation }
  | { kind: "awaiting"; reservation: Reservation }
  | { kind: "conflict"; message: string }
  | { kind: "rejected"; message: string }
  | { kind: "unknown" }
  | { kind: "auth" };
