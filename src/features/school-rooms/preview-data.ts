/**
 * DEVELOPMENT PREVIEW ONLY — fictional rooms, people and availability.
 * Imported only by the /services/rooms/preview route. Never use these as a
 * fallback when the real school service fails.
 */
import { fromMinutes, toMinutes } from "./rules";
import type { Floor, Reservation, RoomAvailability, RoomRules, Slot } from "./types";

export const PREVIEW_RULES: RoomRules = {
  minPeople: 2,
  maxPeople: 5,
  minMinutes: 30,
  maxMinutes: 180,
  stepMinutes: 30,
  opensAt: "08:00",
  closesAt: "22:00",
  maxDaysAhead: 3,
  noShowMinutes: 30,
};

export const PREVIEW_FLOORS: Floor[] = [
  { id: "1F", label: "1F" },
  { id: "2F", label: "2F" },
];

export const PREVIEW_SELF_ID = "1000001";

function slots(booked: [string, string][], pastUntil?: string): Slot[] {
  const out: Slot[] = [];
  for (let m = toMinutes("08:00"); m < toMinutes("22:00"); m += 30) {
    const start = fromMinutes(m);
    const past = pastUntil && m < toMinutes(pastUntil);
    const taken = booked.some(([a, b]) => m >= toMinutes(a) && m < toMinutes(b));
    out.push({
      start,
      end: fromMinutes(m + 30),
      available: !past && !taken,
      reason: past ? "PAST" : taken ? "BOOKED" : undefined,
    });
  }
  return out;
}

export function previewAvailability(floorId: string, dayIndex: number): RoomAvailability[] {
  const pastUntil = dayIndex === 0 ? "11:00" : undefined;
  const rooms = [
    {
      n: 1,
      booked: [
        ["12:00", "14:00"],
        ["18:00", "20:00"],
      ] as [string, string][],
    },
    {
      n: 2,
      booked: [
        ["08:00", "12:30"],
        ["15:00", "16:00"],
      ] as [string, string][],
    },
    { n: 3, booked: [["09:00", "22:00"]] as [string, string][] },
    { n: 4, booked: [["13:30", "15:30"]] as [string, string][] },
  ];
  return rooms.map(({ n, booked }) => ({
    room: {
      id: `${floorId}-${n}`,
      name: `Room ${floorId}-0${n}`,
      floorId,
      capacity: n === 4 ? 8 : 6,
    },
    slots: slots(booked, pastUntil),
  }));
}

export const PREVIEW_RESERVATIONS = (date: string): Reservation[] => [
  {
    id: "r-1",
    roomName: "Room 1F-02",
    floorLabel: "1F",
    date,
    start: "16:00",
    end: "17:30",
    members: ["You", "Alex C.", "Sam W."],
    status: "CONFIRMED",
    cancellable: true,
  },
];
