import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const router = { replace: vi.fn(), refresh: vi.fn() };
let offline = false;
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/offline", () => ({ useOffline: () => offline }));

const { LogoutButton } = await import("./logout-button");

describe("LogoutButton", () => {
  beforeEach(() => {
    router.replace.mockReset();
    router.refresh.mockReset();
  });
  afterEach(() => {
    offline = false;
    vi.unstubAllGlobals();
  });

  it("asks for confirmation, signs out and goes to /login", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<LogoutButton />);

    await userEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(screen.getByRole("alertdialog", { name: "Log out?" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getAllByRole("button", { name: "Log out" }).at(-1)!);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(router.replace).toHaveBeenCalledWith("/login");
  });

  it("stays signed in when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    render(<LogoutButton />);
    await userEvent.click(screen.getByRole("button", { name: "Log out" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Log out" }).at(-1)!);
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("is disabled offline and says why (PWA-AC-04)", () => {
    offline = true;
    render(<LogoutButton />);
    expect(screen.getByRole("button", { name: "Log out" })).toBeDisabled();
    expect(screen.getByText("Unavailable offline")).toBeInTheDocument();
  });
});
