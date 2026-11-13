import { describe, expect, it } from "vitest";
import { canCheckIn, classBadge, codeIssue, normaliseCode, orderClasses } from "./rules";
import type { AttendanceClass } from "./types";

const base: AttendanceClass = {
  id: "c1",
  moduleCode: "CPT203",
  name: "Fictional Module",
  startsAt: "2026-11-16T06:00:00.000Z",
  endsAt: "2026-11-16T07:50:00.000Z",
  location: null,
  window: "OPEN",
  record: "NONE",
  recordedAt: null,
};

describe("class code", () => {
  it("normalises spacing and case", () => {
    expect(normaliseCode(" ab 12 c ")).toBe("AB12C");
  });

  it("asks for a code and rejects symbols", () => {
    expect(codeIssue("  ")).toMatch(/Enter the class code/);
    expect(codeIssue("12-34")).toMatch(/letters and numbers/);
    expect(codeIssue("4821")).toBeNull();
  });
});

describe("check-in availability", () => {
  it("offers check-in only while the window is open and nothing is recorded", () => {
    expect(canCheckIn(base)).toBe(true);
    expect(canCheckIn({ ...base, window: "NOT_OPEN" })).toBe(false);
    expect(canCheckIn({ ...base, record: "PRESENT" })).toBe(false);
  });

  it("does not offer a second attempt while the school is still recording", () => {
    expect(canCheckIn({ ...base, record: "PENDING" })).toBe(false);
  });

  it("shows the record once the school has one", () => {
    expect(classBadge({ ...base, record: "LATE" })).toBe("LATE");
    expect(classBadge({ ...base, window: "CLOSED" })).toBe("CLOSED");
  });

  it("lists open classes first, then by time", () => {
    const early = {
      ...base,
      id: "a",
      window: "CLOSED" as const,
      startsAt: "2026-11-16T01:00:00.000Z",
    };
    const late = {
      ...base,
      id: "b",
      window: "NOT_OPEN" as const,
      startsAt: "2026-11-16T08:00:00.000Z",
    };
    expect(orderClasses([late, early, base]).map((c) => c.id)).toEqual(["c1", "a", "b"]);
  });
});
