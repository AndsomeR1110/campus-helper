import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { DEMO_SPACES } from "../demo-data";
import { SpaceList } from "./space-list";
import { SpaceDetail } from "./space-detail";
const mocked = vi.hoisted(() => ({ refresh: vi.fn(), offline: false }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocked.refresh }) }));
vi.mock("next/offline", () => ({ useOffline: () => mocked.offline }));
const range = { startsAt: "2026-11-06T02:00:00Z", endsAt: "2026-11-06T03:00:00Z" };
it("links the list to details with filters and has no fixed booking action (SP-AC-01, SP-AC-07)", () => {
  render(
    <SpaceList
      catalog={DEMO_SPACES}
      spaces={[{ ...DEMO_SPACES[0], available: false }]}
      query="date=2026-11-06&start=10:00&end=11:00"
    />,
  );
  expect(screen.getByRole("link", { name: /Seat E-01/ })).toHaveAttribute(
    "href",
    expect.stringContaining("/spaces/demo-seat-1?date="),
  );
  expect(screen.queryByRole("button", { name: "Book selected seat" })).not.toBeInTheDocument();
  expect(screen.getByText(/Booked for this time/)).toBeInTheDocument();
});
it("waits for server cancellation confirmation, then refreshes (SP-AC-06)", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ data: { status: "CANCELLED" } }), { status: 200 }),
    );
  vi.stubGlobal("fetch", fetchMock);
  render(
    <SpaceDetail
      space={{ ...DEMO_SPACES[0], available: false }}
      range={range}
      query=""
      now="2026-11-05T00:00:00Z"
      bookings={[
        { ...range, id: "b1", userId: "demo", spaceId: DEMO_SPACES[0].id, status: "CONFIRMED" },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel booking" }),
  );
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith("/api/space-bookings/b1/cancel", expect.any(Object)),
  );
  expect(mocked.refresh).toHaveBeenCalled();
  vi.unstubAllGlobals();
});
it("disables booking while offline (PWA-AC-04)", () => {
  mocked.offline = true;
  render(
    <SpaceDetail
      space={{ ...DEMO_SPACES[0], available: true }}
      range={range}
      query=""
      now="2026-11-05T00:00:00Z"
      bookings={[]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Seat E-01/ }));
  expect(screen.getByRole("button", { name: "Book selected seat" })).toBeDisabled();
  expect(screen.getAllByText("Unavailable offline").length).toBeGreaterThan(0);
  mocked.offline = false;
});
