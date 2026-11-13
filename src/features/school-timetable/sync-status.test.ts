import { describe, expect, it } from "vitest";
import {
  classCount,
  connectionStatus,
  formatWeeks,
  primaryActionLabel,
  syncPhase,
  type SyncInputs,
} from "./sync-status";

const empty = { version: 0, syncedAt: null, term: null, count: 0 };
const saved = { version: 3, syncedAt: "2026-11-13T06:05:00.000Z", term: "2026/27 S1", count: 7 };
const base: SyncInputs = {
  available: true,
  state: empty,
  busy: false,
  error: "",
  cancelled: false,
  loadError: false,
};

describe("syncPhase", () => {
  it("waits for the platform and the saved state", () => {
    expect(syncPhase({ ...base, available: null })).toBe("checking");
    expect(syncPhase({ ...base, state: null })).toBe("checking");
  });

  it("reports a failed read of the saved state before anything else", () => {
    expect(syncPhase({ ...base, loadError: true, busy: true })).toBe("load-error");
  });

  it("shows the platform limit in a browser even when classes are saved", () => {
    expect(syncPhase({ ...base, available: false, state: saved })).toBe("unsupported");
  });

  it("distinguishes a first connection from a refresh", () => {
    expect(syncPhase({ ...base, busy: true })).toBe("connecting");
    expect(syncPhase({ ...base, busy: true, state: saved })).toBe("refreshing");
  });

  it("treats a cancelled school window as neutral, not a failure", () => {
    expect(syncPhase({ ...base, cancelled: true, error: "Connection cancelled." })).toBe(
      "cancelled",
    );
  });

  it("needs attention after a failed attempt and keeps the saved snapshot", () => {
    const inputs = { ...base, state: saved, error: "School connection timed out." };
    expect(syncPhase(inputs)).toBe("attention");
    expect(connectionStatus("attention", saved)).toBe("NEEDS_ATTENTION");
  });

  it("is only synced once the server has a saved snapshot", () => {
    expect(syncPhase(base)).toBe("not-connected");
    expect(syncPhase({ ...base, state: saved })).toBe("synced");
  });
});

describe("connectionStatus / primaryActionLabel", () => {
  it("offers connect before the first snapshot and refresh afterwards", () => {
    expect(primaryActionLabel("not-connected", empty)).toBe("Connect school account");
    expect(primaryActionLabel("synced", saved)).toBe("Refresh timetable");
    expect(primaryActionLabel("cancelled", saved)).toBe("Refresh timetable");
  });

  it("offers no action where the device cannot connect", () => {
    expect(primaryActionLabel("unsupported", saved)).toBeNull();
    expect(connectionStatus("unsupported", saved)).toBe("ANDROID_ONLY");
  });

  it("keeps a saved connection visible after a cancelled refresh", () => {
    expect(connectionStatus("cancelled", saved)).toBe("CONNECTED");
    expect(connectionStatus("cancelled", empty)).toBe("NOT_CONNECTED");
  });
});

describe("formatWeeks", () => {
  it("keeps irregular teaching weeks exact", () => {
    expect(formatWeeks([1, 2, 3, 5, 7, 8])).toBe("Weeks 1–3, 5, 7–8");
    expect(formatWeeks([8, 1, 2, 2])).toBe("Weeks 1–2, 8");
  });

  it("handles a single week and an empty set", () => {
    expect(formatWeeks([4])).toBe("Week 4");
    expect(formatWeeks([])).toBe("");
  });
});

it("pluralises the class count", () => {
  expect(classCount(1)).toBe("1 class");
  expect(classCount(7)).toBe("7 classes");
});
