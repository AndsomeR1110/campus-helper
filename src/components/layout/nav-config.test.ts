import { describe, expect, it } from "vitest";
import { getActiveTab, roleToolsFor, shouldShowBottomNav, isRoleToolRoute } from "./nav-config";

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
    ["/teacher/office-hours", "profile"],
    ["/admin", "profile"],
  ])("%s belongs to the %s tab", (pathname, tab) => {
    expect(getActiveTab(pathname)).toBe(tab);
  });

  it("marks teacher and admin pages as role tools (desktop highlights them there)", () => {
    expect(isRoleToolRoute("/teacher/office-hours")).toBe(true);
    expect(isRoleToolRoute("/admin")).toBe(true);
    expect(isRoleToolRoute("/administrator")).toBe(false);
  });

  it("does not match on a partial segment", () => {
    expect(getActiveTab("/homework")).toBeNull();
    expect(getActiveTab("/administrator")).toBeNull();
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

describe("roleToolsFor (AUTH-AC-04)", () => {
  it("gives students no role tools", () => {
    expect(roleToolsFor("STUDENT")).toEqual([]);
    expect(roleToolsFor(null)).toEqual([]);
  });

  it("gives teachers the teacher dashboard only", () => {
    expect(roleToolsFor("TEACHER").map((t) => t.href)).toEqual(["/teacher/office-hours"]);
  });

  it("gives admins both dashboards", () => {
    expect(roleToolsFor("ADMIN").map((t) => t.href)).toEqual(["/teacher/office-hours", "/admin"]);
  });
});
