import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({ restore: vi.fn(), trips: vi.fn(), schedules: vi.fn() }));
vi.mock("@/features/school-auth", () => ({
  schoolAuthAvailable: () => true,
  restoreSchoolConnection: api.restore,
  SchoolAccountSignIn: () => <div role="dialog">School sign-in</div>,
}));
vi.mock("./bridge", () => ({
  shuttleAvailable: () => true,
  shuttleError: () => "School service unavailable",
  shuttle: { trips: api.trips, schedules: api.schedules },
}));
import { ShuttlePage } from "./shuttle-page";
beforeEach(() => {
  vi.resetAllMocks();
  api.trips.mockResolvedValue([]);
});
it("reads no trips or departures before scoped session restoration confirms success", async () => {
  let confirm!: (result: unknown) => void;
  api.restore.mockReturnValue(
    new Promise((resolve) => {
      confirm = resolve;
    }),
  );
  render(<ShuttlePage actorId="owner" initialDate="2026-11-15" />);
  await waitFor(() => expect(api.restore).toHaveBeenCalledOnce());
  expect(api.trips).not.toHaveBeenCalled();
  expect(api.schedules).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Refresh my trips" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Find departures" })).toBeDisabled();
  confirm({ service: "shuttle" });
  await waitFor(() => expect(api.trips).toHaveBeenCalledOnce());
  await screen.findByText("University account connected");
  expect(screen.getByRole("button", { name: "Find departures" })).toBeEnabled();
  expect(screen.queryByText("School sign-in")).toBeNull();
});
it("does not silently read another app actor's trips or open sign-in", async () => {
  api.restore.mockRejectedValue(
    Object.assign(new Error("account"), { code: "ACCOUNT_SWITCH_REQUIRED" }),
  );
  render(<ShuttlePage actorId="other" initialDate="2026-11-15" />);
  const connect = await screen.findByRole("button", { name: "Connect" });
  await waitFor(() => expect(connect).toBeEnabled());
  expect(api.trips).not.toHaveBeenCalled();
  expect(screen.queryByText("School sign-in")).toBeNull();
  fireEvent.click(connect);
  await screen.findByText("School sign-in");
});
it("requires a user tap after auth expiry and does not fetch stale trips", async () => {
  api.restore.mockRejectedValue(new Error("AUTH_REQUIRED"));
  render(<ShuttlePage actorId="owner" initialDate="2026-11-15" />);
  await screen.findByRole("button", { name: "Reconnect" });
  expect(api.trips).not.toHaveBeenCalled();
  expect(api.schedules).not.toHaveBeenCalled();
  expect(screen.queryByText("School sign-in")).toBeNull();
});
it("aborts restoration on leaving and ignores a late success", async () => {
  let confirm!: (result: unknown) => void;
  api.restore.mockReturnValue(
    new Promise((resolve) => {
      confirm = resolve;
    }),
  );
  const { unmount } = render(<ShuttlePage actorId="owner" initialDate="2026-11-15" />);
  await waitFor(() => expect(api.restore).toHaveBeenCalledOnce());
  const signal: AbortSignal = api.restore.mock.calls[0][3];
  unmount();
  confirm({ service: "shuttle" });
  await Promise.resolve();
  expect(signal.aborted).toBe(true);
  expect(api.trips).not.toHaveBeenCalled();
});
