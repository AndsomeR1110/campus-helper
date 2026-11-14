import { describe, expect, it } from "vitest";
import type { Schedule, Trip } from "./schemas";
import {
  campusShort,
  errorCode,
  failureKind,
  heldTrip,
  journeyDuration,
  sortTrips,
} from "./view-model";

const schedule: Schedule = {
  id: "101",
  date: "2026-11-15",
  departure: "08:30",
  arrival: "09:40",
  from: "TC Campus",
  to: "SIP Campus",
  pickup: "Fictional stop A",
  route: 2,
};
const trip: Trip = {
  id: "9001",
  date: "2026-11-15",
  departure: "08:30",
  arrival: "09:40",
  from: "TC Campus",
  to: "SIP Campus",
  pickup: "Fictional stop A",
  qrAvailable: false,
};

describe("failureKind", () => {
  it("reads codes from native errors and adapter errors", () => {
    expect(errorCode({ code: "AUTH_REQUIRED" })).toBe("AUTH_REQUIRED");
    expect(errorCode(new Error("NATIVE_UNAVAILABLE"))).toBe("NATIVE_UNAVAILABLE");
  });

  it("asks to sign in again when the school session expired", () => {
    expect(failureKind({ code: "AUTH_REQUIRED" })).toBe("auth");
  });

  it("never treats an unconfirmed write as success or failure (RESULT_UNKNOWN)", () => {
    expect(failureKind({ code: "RESULT_UNKNOWN" })).toBe("unknown-result");
  });

  it("asks for a refresh when the trip changed at the school", () => {
    expect(failureKind({ code: "ALREADY_BOOKED" })).toBe("stale");
    expect(failureKind({ code: "NOT_FOUND" })).toBe("stale");
  });

  it("falls back to a generic failure", () => {
    expect(failureKind(new TypeError("Failed to fetch"))).toBe("other");
  });
});

describe("heldTrip", () => {
  it("matches a held departure by journey, not by ID", () => {
    expect(heldTrip(schedule, [trip])).toBe(trip);
    expect(heldTrip({ ...schedule, departure: "10:00" }, [trip])).toBeUndefined();
    expect(heldTrip(schedule, null)).toBeUndefined();
  });
});

it("formats journey length and campus names", () => {
  expect(journeyDuration(schedule)).toBe("1 h 10 min");
  expect(journeyDuration({ departure: "08:30", arrival: "09:15" })).toBe("45 min");
  expect(journeyDuration({ departure: "09:00", arrival: "08:00" })).toBeNull();
  expect(campusShort("TC Campus")).toBe("Taicang");
  expect(campusShort("SIP Campus")).toBe("SIP");
});

it("orders trips by departure", () => {
  const later = { ...trip, id: "9002", date: "2026-11-16" };
  expect(sortTrips([later, trip]).map((t) => t.id)).toEqual(["9001", "9002"]);
});
