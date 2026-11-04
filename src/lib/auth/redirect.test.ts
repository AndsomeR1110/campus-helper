import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it.each(["/profile", "/spaces?date=2026-11-05", "/bookings/space-1#top"])(
    "keeps the site path %s",
    (path) => {
      expect(safeRedirectPath(path)).toBe(path);
    },
  );

  it.each([
    "//evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "/\t/evil.com",
    "https://evil.com",
    "evil.com",
    "javascript:alert(1)",
    "",
    null,
    undefined,
  ])("rejects %j and falls back to /home (AUTH-AC-01)", (next) => {
    expect(safeRedirectPath(next)).toBe("/home");
  });

  it("uses the given fallback", () => {
    expect(safeRedirectPath("//evil.com", "/login")).toBe("/login");
  });
});
