import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi, afterEach } from "vitest";
import type { BookingItem } from "../types";
import { BookingList } from "./booking-list";
import { BookingDetail } from "./booking-detail";
const state = vi.hoisted(() => ({ offline: false, refresh: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: state.refresh, push: state.push }),
}));
vi.mock("next/offline", () => ({ useOffline: () => state.offline }));
const booking: BookingItem = {
  id: "space-b1",
  sourceId: "b1",
  kind: "space",
  href: "/bookings/space-b1",
  title: "Seat E-02",
  startsAt: "2026-11-06T02:00:00Z",
  endsAt: "2026-11-06T03:00:00Z",
  status: "CONFIRMED",
  location: "Demo Library East",
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  state.offline = false;
});
it("renders both fixture types with separate detail links (OH-AC-08, SP-AC-08)", () => {
  render(
    <BookingList
      filter="all"
      result={{
        bookings: [
          booking,
          {
            ...booking,
            id: "office-b1",
            kind: "office",
            href: "/bookings/office-b1",
            title: "Unit teacher fixture",
          },
        ],
        unavailable: [],
      }}
    />,
  );
  expect(screen.getByRole("link", { name: /Seat E-02/ })).toHaveAttribute(
    "href",
    "/bookings/space-b1",
  );
  expect(screen.getByRole("link", { name: /Unit teacher fixture/ })).toHaveAttribute(
    "href",
    "/bookings/office-b1",
  );
  fireEvent.click(screen.getByRole("button", { name: "Office Hour" }));
  expect(state.push).toHaveBeenCalledWith("/bookings?type=office");
});
it("makes missing Office Hour data explicit and offers retry (OH-AC-08)", () => {
  render(<BookingList filter="all" result={{ bookings: [booking], unavailable: ["office"] }} />);
  expect(screen.getByText(/Office Hour bookings are unavailable/)).toBeInTheDocument();
  expect(screen.queryByText("No bookings to show")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(state.refresh).toHaveBeenCalled();
});
it("requires confirmation and preserves the dialog on server failure (SP-AC-06)", async () => {
  const send = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ error: { message: "This booking has started." } }), {
      status: 409,
    }),
  );
  vi.stubGlobal("fetch", send);
  render(<BookingDetail booking={booking} now="2026-11-05T00:00:00Z" />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
  expect(send).not.toHaveBeenCalled();
  fireEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel booking" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("This booking has started."),
  );
  expect(state.refresh).not.toHaveBeenCalled();
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
});
it("refreshes only after successful cancellation (SP-AC-06)", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { status: "CANCELLED" } }), { status: 200 }),
      ),
  );
  render(<BookingDetail booking={booking} now="2026-11-05T00:00:00Z" />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
  fireEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel booking" }),
  );
  await waitFor(() => expect(state.refresh).toHaveBeenCalled());
});
it("prevents started bookings from being cancelled in the UI (SP-AC-06)", () => {
  render(<BookingDetail booking={booking} now="2026-11-07T00:00:00Z" />);
  expect(screen.getByRole("button", { name: "Cancel booking" })).toBeDisabled();
});

it("prevents future bookings from being cancelled offline (PWA-AC-04)", () => {
  state.offline = true;
  render(<BookingDetail booking={booking} now="2026-11-05T00:00:00Z" />);
  expect(screen.getByRole("button", { name: "Cancel booking" })).toBeDisabled();
  expect(screen.getByText("Unavailable offline")).toBeInTheDocument();
});
