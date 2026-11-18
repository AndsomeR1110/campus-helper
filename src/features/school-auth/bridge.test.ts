import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  begin: vi.fn(),
  submitCredentials: vi.fn(),
  submitImageCode: vi.fn(),
  refreshImage: vi.fn(),
  showChallenge: vi.fn(),
  cancel: vi.fn(),
  sync: vi.fn(),
  resume: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "android", isPluginAvailable: () => true },
  registerPlugin: () => mocks,
}));
vi.mock("@/features/school-timetable", () => ({ syncSchoolTimetable: mocks.sync }));
vi.mock("@/features/shuttle", () => ({ resumeShuttleSession: mocks.resume }));
import {
  beginSchoolAuth,
  completeSchoolConnection,
  submitSchoolCredentials,
  submitSchoolImageCode,
} from "./bridge";
const state = {
  operationId: "d8419bd2-aea7-43fa-b7a6-5b3c33b91859",
  actorId: "fictional-owner",
  service: "timetable" as const,
  status: "credentialsRequired" as const,
};
beforeEach(() => {
  vi.clearAllMocks();
});
describe("AUTH public facade", () => {
  it("rejects owner mismatches returned by native", async () => {
    mocks.begin.mockResolvedValue({ ...state, actorId: "another-owner" });
    await expect(beginSchoolAuth(state.actorId, "timetable")).rejects.toThrow("STALE_OPERATION");
  });
  it("rejects stale operation replies", async () => {
    mocks.submitCredentials.mockResolvedValue({
      ...state,
      operationId: "15736da0-4d83-4682-9ff6-25a3cc25638c",
    });
    await expect(submitSchoolCredentials(state, "student", "test-password")).rejects.toThrow(
      "STALE_OPERATION",
    );
  });
  it("does not send credentials to fetch or accept leaked native fields", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    mocks.submitCredentials.mockResolvedValue({ ...state, cookie: "should-not-cross" });
    await expect(submitSchoolCredentials(state, "student", "test-password")).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });
  it("does not submit incomplete challenges or complete unverified authentication", async () => {
    expect(() => submitSchoolImageCode({ ...state, status: "imageRequired" }, "12")).toThrow(
      "INVALID_INPUT",
    );
    await expect(completeSchoolConnection(state)).rejects.toThrow("STALE_OPERATION");
    expect(mocks.submitImageCode).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("awaits the existing silent timetable save before reporting completion", async () => {
    const saved = { count: 7, version: 1, syncedAt: "2026-11-14T00:00:00Z", term: "2026/27 S1" };
    mocks.sync.mockResolvedValue(saved);
    const active = () => true;
    await expect(
      completeSchoolConnection({ ...state, status: "authenticated" }, active),
    ).resolves.toEqual({ service: "timetable", synced: saved });
    expect(mocks.sync).toHaveBeenCalledWith(state.actorId, active, true);
  });
  it("does not continue after an account switch", async () => {
    await expect(
      completeSchoolConnection({ ...state, status: "authenticated" }, () => false),
    ).rejects.toThrow("STALE_OPERATION");
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("continues the shuttle through a fresh hidden session check", async () => {
    await expect(
      completeSchoolConnection({ ...state, service: "shuttle", status: "authenticated" }),
    ).resolves.toEqual({ service: "shuttle" });
    expect(mocks.resume).toHaveBeenCalledOnce();
  });
});
