import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({
  restore: vi.fn(),
  read: vi.fn(),
  forget: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock("@/features/school-auth", () => ({
  schoolAuthAvailable: () => true,
  restoreSchoolConnection: api.restore,
  disconnectSchoolAccount: api.disconnect,
  SchoolAccountSignIn: () => <div role="dialog">School sign-in</div>,
}));
vi.mock("./bridge", () => ({
  schoolTimetableAvailable: () => true,
  readSyncState: api.read,
  forgetSchoolConnection: api.forget,
  connectionError: () => "Could not refresh. Saved classes are kept.",
}));
import { SchoolTimetableConnection } from "./connection";
const saved = { version: 1, count: 7, term: "2026/27 S1", syncedAt: "2026-11-14T06:00:00Z" };
beforeEach(() => {
  vi.resetAllMocks();
  api.read.mockResolvedValue(saved);
  api.restore.mockResolvedValue({ service: "timetable", synced: saved });
  api.forget.mockResolvedValue(undefined);
});
it("refreshes a saved connection without presenting sign-in", async () => {
  render(<SchoolTimetableConnection actorId="owner" />);
  await waitFor(() => expect(api.restore).toHaveBeenCalledOnce());
  await screen.findByRole("button", { name: "Refresh timetable" });
  expect(screen.queryByText("School sign-in")).toBeNull();
});
it("asks for attention on automatic auth expiry, opening sign-in only after a tap", async () => {
  api.restore.mockRejectedValue(new Error("AUTH_REQUIRED"));
  render(<SchoolTimetableConnection actorId="owner" />);
  const button = await screen.findByRole("button", { name: "Sign in to refresh" });
  expect(screen.queryByText("School sign-in")).toBeNull();
  fireEvent.click(button);
  await screen.findByText("School sign-in");
});
it("keeps a network failure distinct from needing credentials", async () => {
  api.restore.mockRejectedValue(new Error("SCHOOL_UNAVAILABLE"));
  render(<SchoolTimetableConnection actorId="owner" />);
  await screen.findByText("Could not refresh. Saved classes are kept.");
  expect(screen.queryByText("School sign-in")).toBeNull();
  expect(screen.queryByRole("button", { name: "Sign in to refresh" })).toBeNull();
});
it("forgets only the timetable cache, with confirmation and accurate session copy", async () => {
  render(<SchoolTimetableConnection actorId="owner" />);
  const button = await screen.findByRole("button", { name: "Forget saved timetable connection" });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  expect(api.forget).not.toHaveBeenCalled();
  await screen.findByText(/Your saved classes and university sign-in stay/);
  fireEvent.click(screen.getByRole("button", { name: "Forget connection" }));
  await waitFor(() => expect(api.forget).toHaveBeenCalledWith("owner"));
  expect(api.disconnect).not.toHaveBeenCalled();
});
it("aborts the silent auth attempt when leaving the page", async () => {
  api.restore.mockReturnValue(new Promise(() => {}));
  const { unmount } = render(<SchoolTimetableConnection actorId="owner" />);
  await waitFor(() => expect(api.restore).toHaveBeenCalledOnce());
  const signal: AbortSignal = api.restore.mock.calls[0][3];
  unmount();
  expect(signal.aborted).toBe(true);
});
