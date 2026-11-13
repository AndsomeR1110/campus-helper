import { describe, expect, it } from "vitest";
import { normalizeSnapshot } from "./schemas";
import { getOccurrencesInWeek } from "@/features/courses";
export const activity = {
  identity: "activity-a",
  moduleId: "ABC123TC",
  name: "ABC123TC-Lecture",
  staff: "Test Teacher",
  location: "TC-A-1001",
  scheduledDay: "0",
  startTime: "2000-01-01T02:00:00Z",
  endTime: "2000-01-01T04:00:00Z",
  weekPattern: "1-3, 5, 7-9",
};
describe("AUTO-02 complete school snapshots", () => {
  it("preserves irregular weeks and matches official time display", () => {
    const rows = normalizeSnapshot({ term: "2026/27 S1", activities: [activity] });
    expect(rows[0]).toMatchObject({
      startTime: "10:00",
      endTime: "11:50",
      weeks: [1, 2, 3, 5, 7, 8, 9],
    });
  });
  it("rejects unknown terms, partial responses and duplicate source IDs", () => {
    for (const snapshot of [
      { term: "2027/28 S1", activities: [activity] },
      { term: "2026/27 S1", activities: [] },
      { term: "2026/27 S1", activities: [activity, activity] },
      { term: "2026/27 S1", activities: [{ ...activity, weekPattern: "1-3,broken" }] },
    ])
      expect(() => normalizeSnapshot(snapshot)).toThrow();
  });
  it("does not generate a class in a gap of a school week set", () => {
    const course = {
      id: "school-a",
      ownerId: "test",
      code: "ABC123TC",
      name: "Test",
      teacher: null,
      location: null,
      weekday: "MONDAY" as const,
      startTime: "10:00",
      endTime: "11:50",
      firstWeek: 1,
      lastWeek: 9,
      weekParity: "ALL" as const,
      schoolWeeks: [1, 2, 3, 5, 7, 8, 9],
    };
    expect(getOccurrencesInWeek(course, "2026-09-07", 4)).toHaveLength(0);
    expect(getOccurrencesInWeek(course, "2026-09-07", 5)).toHaveLength(1);
  });
});
