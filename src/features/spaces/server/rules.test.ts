import { describe, expect, it } from "vitest";
import { DEMO_SPACES } from "../demo-data";
import { parseSpaceFilters } from "../filters";
import type { SpaceBooking, TimeRange } from "../types";
import { assertCanCancel, filterSpaces, isAvailable, overlaps, validateRange } from "./rules";

const now = new Date("2026-11-01T00:00:00Z");
const range = { startsAt: "2026-11-02T02:00:00Z", endsAt: "2026-11-02T03:00:00Z" };
const booking: SpaceBooking = {
  ...range,
  id: "b1",
  userId: "a",
  spaceId: "demo-seat-1",
  status: "CONFIRMED",
};

describe("study space rules", () => {
  it("combines building, floor and seat type filters (SP-AC-01)", () => {
    const result = filterSpaces(DEMO_SPACES, {
      building: "Demo Library East",
      floor: 1,
      type: "DISCUSSION",
    });
    expect(result.map((s) => s.id)).toEqual([
      "demo-seat-1",
      "demo-seat-4",
      "demo-seat-7",
      "demo-seat-10",
    ]);
    expect(filterSpaces(DEMO_SPACES, { floor: 99 })).toEqual([]);
  });
  it("parses URL filters in Shanghai time and rejects malformed dates (SP-AC-01, SP-AC-05)", () => {
    expect(
      parseSpaceFilters(
        new URLSearchParams("date=2026-11-02&start=10:00&end=11:00&floor=2&type=QUIET"),
      ),
    ).toEqual({
      filters: { floor: 2, type: "QUIET", building: undefined },
      range: { startsAt: "2026-11-02T02:00:00.000Z", endsAt: "2026-11-02T03:00:00.000Z" },
    });
    for (const query of [
      "date=2026-02-30&start=10:00&end=11:00",
      "date=2026-11-02&start=25:00&end=11:00",
      "date=2026-11-02&start=10:00&end=11:00&floor=NaN",
      "date=2026-11-02&start=10:00&end=11:00&type=INVALID",
      "",
    ])
      expect(parseSpaceFilters(new URLSearchParams(query))).toBeNull();
  });
  it("recomputes availability for the selected interval and ignores cancelled records (SP-AC-02, SP-AC-06)", () => {
    expect(isAvailable(booking.spaceId, range, [booking])).toBe(false);
    expect(isAvailable("demo-seat-2", range, [booking])).toBe(true);
    expect(
      isAvailable(booking.spaceId, { startsAt: range.endsAt, endsAt: "2026-11-02T04:00:00Z" }, [
        booking,
      ]),
    ).toBe(true);
    expect(isAvailable(booking.spaceId, range, [{ ...booking, status: "CANCELLED" }])).toBe(true);
  });
  it("detects contained, containing and partial overlaps but permits adjacent times (SP-AC-04)", () => {
    expect(overlaps(range, range)).toBe(true);
    expect(
      overlaps(range, { startsAt: "2026-11-02T01:30:00Z", endsAt: "2026-11-02T02:30:00Z" }),
    ).toBe(true);
    expect(
      overlaps(range, { startsAt: "2026-11-02T01:00:00Z", endsAt: "2026-11-02T04:00:00Z" }),
    ).toBe(true);
    expect(overlaps(range, { startsAt: range.endsAt, endsAt: "2026-11-02T04:00:00Z" })).toBe(false);
  });
  it.each<TimeRange>([
    { ...range, startsAt: "invalid" },
    { startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-11-01T00:30:00Z" },
    { ...range, endsAt: range.startsAt },
    { ...range, endsAt: "2026-11-02T01:00:00Z" },
    { ...range, endsAt: "2026-11-02T02:15:00Z" },
    { ...range, endsAt: "2026-11-02T05:30:00Z" },
    { ...range, startsAt: "2026-11-02T02:00:01Z" },
    { startsAt: "2026-11-08T00:00:00Z", endsAt: "2026-11-08T00:30:00Z" },
    { startsAt: "2026-02-30T02:00:00Z", endsAt: "2026-02-30T03:00:00Z" },
    { startsAt: "2026-11-02T10:00:00", endsAt: "2026-11-02T11:00:00" },
  ])("rejects invalid, past, unaligned and out-of-window ranges (SP-AC-05): %j", (input) => {
    expect(() => validateRange(input, now)).toThrow();
  });
  it("accepts 30 and 180 minutes and the exact 7-day end boundary (SP-AC-05)", () => {
    for (const endsAt of ["2026-11-02T02:30:00Z", "2026-11-02T05:00:00Z"])
      expect(() => validateRange({ ...range, endsAt }, now)).not.toThrow();
    expect(() =>
      validateRange({ startsAt: "2026-11-07T23:30:00Z", endsAt: "2026-11-08T00:00:00Z" }, now),
    ).not.toThrow();
  });
  it("restricts cancellation to the owner before start and preserves history (SP-AC-06)", () => {
    expect(() => assertCanCancel(booking, "a", now)).not.toThrow();
    expect(() => assertCanCancel(booking, "b", now)).toThrow("Booking not found");
    expect(() => assertCanCancel(null, "a", now)).toThrow();
    expect(() => assertCanCancel(booking, "a", new Date(range.startsAt))).toThrow();
    expect(() => assertCanCancel({ ...booking, status: "CANCELLED" }, "a", now)).toThrow();
  });
});
