import { describe, expect, it } from "vitest";
import { mergeCourseSources } from "./merge-sources";
import type { Course } from "./types";
const manual: Course = {
  id: "manual",
  ownerId: "owner",
  code: "ABC123",
  name: "Manual",
  teacher: null,
  weekday: "MONDAY",
  startTime: "10:00",
  endTime: "12:00",
  location: null,
  firstWeek: 1,
  lastWeek: 13,
  weekParity: "ALL",
};
describe("AUTO-04 combined timetable", () => {
  it("shows duplicate school slots once without mutating manual data", () => {
    const school = { ...manual, id: "school-a", source: "school" as const, endTime: "11:50" };
    expect(mergeCourseSources([manual], [school])).toEqual([school]);
    expect(manual.endTime).toBe("12:00");
  });
  it("preserves unrelated manual classes and distinct school activities", () => {
    const school = { ...manual, id: "school-a", source: "school" as const, startTime: "14:00" };
    expect(mergeCourseSources([manual], [school, { ...school, id: "school-b" }])).toHaveLength(3);
  });
});
describe("AUTO-04 reminders on combined timetable", () => {
  it("carries a hidden manual course's reminder over to the school course", () => {
    const school = { ...manual, id: "school-a", source: "school" as const };
    const [merged] = mergeCourseSources([manual], [school], new Map([["manual", 15]]));
    expect(merged).toMatchObject({
      id: "school-a",
      inheritedReminder: { courseId: "manual", offsetMinutes: 15 },
    });
  });
  it("leaves school courses without a covered reminder unchanged", () => {
    const school = { ...manual, id: "school-a", source: "school" as const, startTime: "14:00" };
    const merged = mergeCourseSources([manual], [school], new Map([["manual", 15]]));
    expect(merged.find((c) => c.id === "school-a")).toEqual(school);
  });
});
