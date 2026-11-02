import type { Actor, Space, SpaceBooking, SpaceFilters, TimeRange } from "../types";

export class SpaceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: 400 | 401 | 403 | 404 | 409,
  ) {
    super(message);
  }
}

const HALF_HOUR = 30 * 60_000;
const WEEK = 7 * 24 * 60 * 60_000;
const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export function validateRange(range: TimeRange, now: Date): void {
  const start = Date.parse(range.startsAt);
  const end = Date.parse(range.endsAt);
  if (
    !UTC_ISO.test(range.startsAt) ||
    !UTC_ISO.test(range.endsAt) ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    new Date(start).toISOString().replace(".000Z", "Z") !== range.startsAt.replace(".000Z", "Z") ||
    new Date(end).toISOString().replace(".000Z", "Z") !== range.endsAt.replace(".000Z", "Z") ||
    start % HALF_HOUR !== 0 ||
    end % HALF_HOUR !== 0 ||
    end - start < HALF_HOUR ||
    end - start > 6 * HALF_HOUR ||
    start <= now.getTime() ||
    end > now.getTime() + WEEK
  ) {
    throw new SpaceError(
      "INVALID_TIME_RANGE",
      "Choose a future time within 7 days, in 30-minute steps, lasting 30–180 minutes.",
      400,
    );
  }
}

/** Half-open intervals allow consecutive bookings, e.g. 10–11 and 11–12. */
export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return (
    Date.parse(a.startsAt) < Date.parse(b.endsAt) && Date.parse(b.startsAt) < Date.parse(a.endsAt)
  );
}

export function isAvailable(spaceId: string, range: TimeRange, bookings: readonly SpaceBooking[]) {
  return !bookings.some(
    (b) => b.spaceId === spaceId && b.status === "CONFIRMED" && overlaps(range, b),
  );
}

export function filterSpaces(spaces: readonly Space[], filters: SpaceFilters) {
  return spaces.filter(
    (s) =>
      (!filters.building || s.building === filters.building) &&
      (filters.floor === undefined || s.floor === filters.floor) &&
      (!filters.type || s.type === filters.type),
  );
}

export function requireActor(actor: Actor | null): Actor {
  if (!actor) throw new SpaceError("UNAUTHENTICATED", "Sign in to view your bookings.", 401);
  return actor;
}

export function requireBooker(actor: Actor | null): Actor {
  const user = requireActor(actor);
  if (user.role !== "STUDENT" && user.role !== "ADMIN") {
    throw new SpaceError("FORBIDDEN", "Only students and administrators can book seats.", 403);
  }
  return user;
}

export function assertCanCancel(booking: SpaceBooking | null, userId: string, now: Date) {
  if (!booking || booking.userId !== userId) {
    throw new SpaceError("NOT_FOUND", "Booking not found.", 404);
  }
  if (booking.status !== "CONFIRMED" || Date.parse(booking.startsAt) <= now.getTime()) {
    throw new SpaceError(
      "CANNOT_CANCEL",
      "Only confirmed bookings that have not started can be cancelled.",
      409,
    );
  }
}
