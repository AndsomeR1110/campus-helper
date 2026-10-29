import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { DEMO_SPACES } from "../demo-data";
import { SpacePicker } from "./space-picker";

const range = { startsAt: "2026-11-02T02:00:00Z", endsAt: "2026-11-02T03:00:00Z" };

it("labels demo data and preserves selected seat after a server conflict (SP-AC-04, SP-AC-07)", async () => {
  const onBook = vi.fn().mockRejectedValue(new Error("conflict"));
  render(
    <SpacePicker
      spaces={[{ ...DEMO_SPACES[0], available: true }]}
      range={range}
      query="date=2026-11-02&start=10:00&end=11:00"
      onBook={onBook}
      onRetry={() => {}}
    />,
  );
  expect(screen.getByText(/not official real-time availability/i)).toBeInTheDocument();
  const seat = screen.getByRole("button", { name: "E-01" });
  fireEvent.click(seat);
  fireEvent.click(screen.getByRole("button", { name: "Book selected seat" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("Your selection has been kept"),
  );
  expect(seat).toHaveAttribute("aria-pressed", "true");
  expect(onBook).toHaveBeenCalledWith(DEMO_SPACES[0].id, range);
  expect(screen.getByLabelText("Date")).toHaveValue("2026-11-02");
});

it("disables occupied seats instead of allowing submission (SP-AC-02)", () => {
  render(
    <SpacePicker
      spaces={[{ ...DEMO_SPACES[0], available: false }]}
      range={range}
      query=""
      onBook={vi.fn()}
      onRetry={() => {}}
    />,
  );
  expect(screen.getByRole("button", { name: /E-01/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Book selected seat" })).toBeDisabled();
});
