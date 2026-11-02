import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { DEMO_SPACES } from "../demo-data";
import { bookingFailureMessage, SpacePicker } from "./space-picker";
const range = { startsAt: "2026-11-02T02:00:00Z", endsAt: "2026-11-02T03:00:00Z" };
it("uses one selectable card and keeps selection after a 409 (SP-AC-04, SP-AC-07)", async () => {
  const onBook = vi.fn().mockRejectedValue({ status: 409 });
  render(
    <SpacePicker
      spaces={[{ ...DEMO_SPACES[0], available: true }]}
      range={range}
      query="date=2026-11-02&start=10:00&end=11:00"
      onBook={onBook}
      onRetry={() => {}}
    />,
  );
  expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  const card = screen.getByRole("button", { name: /Seat E-01/ });
  expect(screen.getAllByText("Seat E-01")).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "10:00–11:00" })).not.toBeInTheDocument();
  fireEvent.click(card);
  fireEvent.click(screen.getByRole("button", { name: "Book selected seat" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("already booked"));
  expect(card).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText(/not official real-time/)).toBeInTheDocument();
});
it("distinguishes network and generic errors from conflicts (SP-AC-04)", () => {
  expect(bookingFailureMessage({ status: 409 })).toContain("already booked");
  expect(bookingFailureMessage({ code: "BOOKING_CONFLICT" })).toContain("already booked");
  expect(bookingFailureMessage(new TypeError("fetch failed"))).toContain("connection");
  expect(bookingFailureMessage({ status: 500 })).not.toContain("already booked");
});
it("disables booked cards and keeps filter values in the URL form (SP-AC-01, SP-AC-02)", () => {
  render(
    <SpacePicker
      spaces={[{ ...DEMO_SPACES[0], available: false }]}
      range={range}
      query=""
      onBook={vi.fn()}
      onRetry={() => {}}
    />,
  );
  expect(screen.getByRole("button", { name: /Seat E-01/ })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Quiet seat" }));
  expect(document.querySelector('input[name="type"]')).toHaveValue("QUIET");
});
