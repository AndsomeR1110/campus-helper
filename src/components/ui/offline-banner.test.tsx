import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let offline = false;
vi.mock("next/offline", () => ({ useOffline: () => offline }));

const { OfflineBanner } = await import("./offline-banner");

describe("OfflineBanner (PWA-AC-03)", () => {
  afterEach(() => {
    offline = false;
    vi.useRealTimers();
  });

  it("renders nothing while online", () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("explains what is unavailable while offline", () => {
    offline = true;
    render(<OfflineBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/You’re offline/);
    expect(screen.getByRole("status")).toHaveTextContent(/Bookings and posts are unavailable/);
  });

  it("shows 'Back online' for 3 seconds after reconnecting", () => {
    vi.useFakeTimers();
    offline = true;
    const { rerender } = render(<OfflineBanner />);

    offline = false;
    rerender(<OfflineBanner />);
    expect(screen.getByRole("status")).toHaveTextContent("Back online");

    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
