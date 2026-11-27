import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { requestLostFoundMatches } from "../server/match-action";
import { PossibleMatches } from "./possible-matches";

vi.mock("../server/match-action", () => ({ requestLostFoundMatches: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("checks only on request and links to the found post with a reason (LF-AI-AC-02)", async () => {
  const request = vi.mocked(requestLostFoundMatches).mockResolvedValue({
    matches: [
      { postId: "found-id", title: "Found earbud case", reason: "Same colour and location." },
    ],
  });
  render(<PossibleMatches postId="lost-id" />);
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Find matches with AI" }));
  expect(request).toHaveBeenCalledWith("lost-id");
  const link = await screen.findByRole("link", { name: "Found earbud case" });
  expect(link.getAttribute("href")).toBe("/lost-found/found-id");
  expect(screen.getByText("Same colour and location.")).toBeTruthy();
});

it("shows a retry on failure and a distinct empty result (LF-AI-AC-03)", async () => {
  vi.mocked(requestLostFoundMatches)
    .mockRejectedValueOnce(new Error("Network"))
    .mockResolvedValueOnce({ matches: [] });
  render(<PossibleMatches postId="lost-id" />);
  fireEvent.click(screen.getByRole("button", { name: "Find matches with AI" }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("No clear matches yet")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});
