import { describe, expect, it } from "vitest";
import {
  durationOptions,
  formatMinutes,
  freeRanges,
  fromMinutes,
  memberIssues,
  partyIssue,
  ruleLines,
  startOptions,
  toMinutes,
} from "./rules";
import type { RoomRules, Slot } from "./types";

// Mirrors the 2026-11-13 student rules snapshot; real values come from the school.
const rules: RoomRules = {
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

function day(booked: string[] = []): Slot[] {
  const slots: Slot[] = [];
  for (let m = toMinutes("08:00"); m < toMinutes("22:00"); m += 30) {
    const start = fromMinutes(m);
    const taken = booked.includes(start);
    slots.push({
      start,
      end: fromMinutes(m + 30),
      available: !taken,
      reason: taken ? "BOOKED" : undefined,
    });
  }
  return slots;
}

describe("durationOptions", () => {
  it("offers lengths up to the school maximum", () => {
    expect(durationOptions(day(), "09:00", rules)).toEqual([30, 60, 90, 120, 150, 180]);
  });

  it("stops at the next booked slot", () => {
    expect(durationOptions(day(["10:00"]), "09:00", rules)).toEqual([30, 60]);
  });

  it("stops at closing time", () => {
    expect(durationOptions(day(), "21:00", rules)).toEqual([30, 60]);
  });

  it("respects a longer minimum from the school", () => {
    expect(durationOptions(day(["10:00"]), "09:30", { ...rules, minMinutes: 60 })).toEqual([]);
  });
});

it("only offers start times that fit the minimum length", () => {
  const starts = startOptions(day(["10:00"]), { ...rules, minMinutes: 60 }).map((s) => s.start);
  expect(starts).not.toContain("09:30");
  expect(starts).toContain("09:00");
  expect(starts).not.toContain("10:00");
});

describe("members", () => {
  it("counts the booker once and rejects re-entering them", () => {
    expect(memberIssues(["1234567"], "1234567")).toEqual(["SELF"]);
  });

  it("flags empty, malformed and duplicate entries", () => {
    expect(memberIssues(["", "12a", "2345678", " 2345678 "], null)).toEqual([
      "EMPTY",
      "FORMAT",
      null,
      "DUPLICATE",
    ]);
  });

  it("checks party size including the booker", () => {
    expect(partyIssue([], rules)).toMatch(/Add 1 more member/);
    expect(partyIssue(["1", "2", "3", "4"], rules)).toBeNull();
    expect(partyIssue(["1", "2", "3", "4", "5"], rules)).toMatch(/up to 5 people/);
  });
});

it("describes rules from the school values", () => {
  expect(ruleLines(rules)).toContain("2–5 people, including you");
  expect(ruleLines({ ...rules, maxDaysAhead: 0, noShowMinutes: null })).toEqual([
    "2–5 people, including you",
    "30 min to 3 h per booking",
    "Open 08:00–22:00",
    "Book for today only",
  ]);
  expect(formatMinutes(90)).toBe("1 h 30 min");
});

it("summarises free time as ranges", () => {
  expect(freeRanges(day(["10:00", "10:30", "21:30"]))).toEqual(["08:00–10:00", "11:00–21:30"]);
  expect(freeRanges(day().map((s) => ({ ...s, available: false })))).toEqual([]);
});
