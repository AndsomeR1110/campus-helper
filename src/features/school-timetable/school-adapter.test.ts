import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverTimetable, fetchSchoolTimetable } from "./school-adapter";
afterEach(() => {
  delete (window as typeof window & { __campusTimetableNavigating?: boolean })
    .__campusTimetableNavigating;
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});
describe("AUTO-01 school page automation", () => {
  it.each([
    [401, "AUTH_REQUIRED"],
    [403, "AUTH_REQUIRED"],
    [503, "SCHOOL_UNAVAILABLE"],
    [412, "SCHOOL_UNAVAILABLE"],
  ])("distinguishes HTTP %s from an expired login", async (status, code) => {
    vi.stubGlobal("location", new URL("https://timetableplus.xjtlu.edu.cn/pt/#/" + "a".repeat(64)));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status }));
    await expect(fetchSchoolTimetable()).rejects.toThrow(String(code));
  });
  it("clicks the actual input-button SSO entry without accessing login fields", () => {
    vi.stubGlobal("location", new URL("https://ebridge.xjtlu.edu.cn/"));
    document.body.innerHTML = '<input type="button" value="XJTLU Account">';
    const click = vi.spyOn(document.querySelector("input")!, "click");
    expect(discoverTimetable()).toEqual({ status: "login" });
    expect(click).toHaveBeenCalledOnce();
    discoverTimetable();
    expect(click).toHaveBeenCalledOnce();
  });
  it("rejects an unexpected school origin before fetching", async () => {
    vi.stubGlobal("location", new URL("https://example.org/pt/"));
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(fetchSchoolTimetable()).rejects.toThrow("INVALID_SCHOOL_PAGE");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("strips unneeded fields and never returns the enrollment credential", async () => {
    vi.stubGlobal("location", new URL("https://timetableplus.xjtlu.edu.cn/pt/#/" + "a".repeat(64)));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ identity: "a", secretField: "hidden" }],
      }),
    );
    const result = await fetchSchoolTimetable();
    expect(JSON.stringify(result)).not.toContain("secretField");
    expect(JSON.stringify(result)).not.toContain("a".repeat(64));
  });
});
