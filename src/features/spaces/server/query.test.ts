import { expect, it } from "vitest";
import { resolveSpaceQuery } from "./query";
it("defaults to a future Shanghai half-hour even near midnight (SP-AC-05)", () => {
  const q = resolveSpaceQuery({}, new Date("2026-11-04T15:45:00Z"));
  expect(q.parsed?.range).toEqual({
    startsAt: "2026-11-04T16:00:00.000Z",
    endsAt: "2026-11-04T17:00:00.000Z",
  });
  expect(new URLSearchParams(q.query).get("date")).toBe("2026-11-05");
});
it("retains invalid filters and rejects duplicate or past query inputs (SP-AC-01, SP-AC-05)", () => {
  const now = new Date("2026-11-04T00:00:00Z");
  for (const input of [
    { date: "2026-02-30" },
    { date: ["2026-11-05", "2026-11-06"] },
    { date: "2000-01-01" },
    { floor: "bad" },
    { start: "10:00", end: "14:00" },
  ]) {
    const q = resolveSpaceQuery(input, now);
    expect(q.parsed).toBeNull();
    expect(q.error).toBeTruthy();
  }
  const q = resolveSpaceQuery(
    { date: "2026-11-05", start: "10:00", end: "11:00", floor: "2", type: "QUIET" },
    now,
  );
  expect(q.parsed?.filters).toMatchObject({ floor: 2, type: "QUIET" });
});
