import { describe, expect, it } from "vitest";
import {
  dayKey,
  formatDate,
  formatDateTimeRange,
  formatDateWithYear,
  formatGreeting,
  formatRelativeDay,
  formatRelativeTime,
  formatTime,
  formatTimeRange,
} from "./time";

// 2026-11-03 06:00Z is Tue 3 Nov 14:00 in Asia/Shanghai (UTC+8).
const start = "2026-11-03T06:00:00Z";
const end = "2026-11-03T08:00:00Z";

describe("time formatting (Asia/Shanghai)", () => {
  it("formats dates and times in the app time zone", () => {
    expect(formatDate(start)).toBe("Tue 3 Nov");
    expect(formatDateWithYear(start)).toBe("3 Nov 2026");
    expect(formatTime(start)).toBe("14:00");
    expect(formatTimeRange(start, end)).toBe("14:00–16:00");
  });

  it("uses the Shanghai calendar day, not UTC", () => {
    // 17:30Z on 2 Nov is already 01:30 on 3 Nov in Shanghai.
    expect(dayKey("2026-11-02T17:30:00Z")).toBe("2026-11-03");
    expect(formatTime("2026-11-02T17:30:00Z")).toBe("01:30");
  });

  it("uses 24-hour time with leading zeros", () => {
    expect(formatTime("2026-11-03T00:05:00Z")).toBe("08:05");
    expect(formatTime("2026-11-03T16:00:00Z")).toBe("00:00");
  });

  it("says Today / Tomorrow relative to now", () => {
    const now = "2026-11-03T01:00:00Z"; // Tue 09:00
    expect(formatRelativeDay(start, now)).toBe("Today");
    expect(formatRelativeDay("2026-11-04T06:00:00Z", now)).toBe("Tomorrow");
    expect(formatRelativeDay("2026-11-05T06:00:00Z", now)).toBe("Thu 5 Nov");
    expect(formatDateTimeRange(start, end, now)).toBe("Today, 14:00–16:00");
  });

  it("formats notification timestamps", () => {
    const now = "2026-11-03T06:00:00Z";
    expect(formatRelativeTime("2026-11-03T05:59:40Z", now)).toBe("Just now");
    expect(formatRelativeTime("2026-11-03T05:55:00Z", now)).toBe("5 min ago");
    expect(formatRelativeTime("2026-11-03T03:00:00Z", now)).toBe("3 h ago");
    expect(formatRelativeTime("2026-11-01T06:00:00Z", now)).toBe("Sun 1 Nov");
  });

  it("uses three-letter month names", () => {
    expect(formatDate("2026-09-15T04:00:00Z")).toBe("Tue 15 Sep");
  });
});

describe("formatGreeting", () => {
  it("greets by Shanghai local time", () => {
    expect(formatGreeting("2026-11-03T00:30:00Z")).toBe("Good morning"); // 08:30
    expect(formatGreeting("2026-11-03T04:00:00Z")).toBe("Good afternoon"); // 12:00
    expect(formatGreeting("2026-11-03T10:00:00Z")).toBe("Good evening"); // 18:00
    expect(formatGreeting("2026-11-02T19:00:00Z")).toBe("Good evening"); // 03:00
  });
});
