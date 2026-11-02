import { describe, expect, it } from "vitest";
import { getActiveTab, shouldShowBottomNav } from "./nav-config";

describe("getActiveTab", () => {
  it.each([
    ["/home", "home"],
    ["/notifications", "home"],
    ["/services", "services"],
    ["/office-hours/abc", "services"],
    ["/spaces", "services"],
    ["/lost-found/new", "services"],
    ["/schedule", "schedule"],
    ["/courses/1/edit", "schedule"],
    ["/profile", "profile"],
    ["/bookings/office-1", "profile"],
    ["/my/posts", "profile"],
  ])("%s belongs to the %s tab", (pathname, tab) => {
    expect(getActiveTab(pathname)).toBe(tab);
  });

  it("does not match on a partial segment", () => {
    expect(getActiveTab("/homework")).toBeNull();
    expect(getActiveTab("/admin")).toBeNull();
  });
});

describe("shouldShowBottomNav", () => {
  it.each(["/home", "/services", "/schedule", "/profile", "/spaces", "/bookings", "/lost-found"])(
    "shows on top-level and list page %s",
    (pathname) => {
      expect(shouldShowBottomNav(pathname)).toBe(true);
    },
  );

  it.each([
    "/office-hours/t1",
    "/spaces/s1",
    "/bookings/space-1",
    "/courses/new",
    "/courses/c1/edit",
    "/lost-found/new",
    "/lost-found/p1",
  ])("hides on detail and form page %s", (pathname) => {
    expect(shouldShowBottomNav(pathname)).toBe(false);
  });
});
