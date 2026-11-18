import { afterEach, describe, expect, it, vi } from "vitest";
import { shuttleSchoolRequest } from "./school-adapter.js";

const origin = "https://shuttlebus.xjtlu.edu.cn";
const card = `<div class="card"><div class="card-body"><label>08:30</label>
<label>TC Campus</label><label></label><label>09:50</label><label>SIP Campus</label>
<label>Pick-up Point:</label><label>Between C2 and D1</label></div>
<form method="post" action="${origin}/schedule/book/3"><input name="_token" value="test-csrf">
<input name="departure_date" value="2026-11-14"><button type="submit">Book it</button></form></div>`;
function reply(body: string, path = "/", status = 200) {
  return {
    ok: status < 400,
    status,
    url: origin + path,
    headers: new Headers(),
    text: async () => body,
  };
}
function page(title: string, content: string) {
  return `<title>Shuttle Bus - ${title}</title><main>${content}</main>`;
}
afterEach(() => vi.unstubAllGlobals());

describe("SH-AC-01 school response boundaries", () => {
  it("accepts departed history cards without inventing actionable booking IDs", async () => {
    const history = `<div class="card"><div class="card-body"><label>2026-11-13</label><label>17:10</label><label>TC Campus</label><label>18:30</label><label>SIP Campus</label><label>Booked</label></div></div>`;
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(reply(page("Booking List", history)))
        .mockResolvedValueOnce(reply(page("Homepage", ""))),
    );
    await expect(shuttleSchoolRequest("trips", {})).resolves.toEqual({ trips: [] });
  });
  it("never reports an unexpected school page as an empty personal list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(reply(page("Booking Result", "Please try again"))),
    );
    await expect(shuttleSchoolRequest("trips", {})).rejects.toThrow("UNEXPECTED_RESPONSE");
  });
  it("cannot cancel a trip absent from the authenticated user's list", async () => {
    const fetch = vi.fn().mockResolvedValue(reply(page("Booking List", "您还没有预约区间车")));
    vi.stubGlobal("fetch", fetch);
    await expect(shuttleSchoolRequest("cancel", { id: "99", confirmed: true })).rejects.toThrow(
      "NOT_FOUND",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("never retries an ambiguous booking write", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(reply(page("Schedule Search", card)))
      .mockResolvedValueOnce(reply(page("Booking List", "您还没有预约区间车")))
      .mockRejectedValueOnce(new Error("connection lost"));
    vi.stubGlobal("fetch", fetch);
    await expect(
      shuttleSchoolRequest("book", { id: "3", date: "2026-11-14", route: 2, confirmed: true }),
    ).rejects.toThrow("RESULT_UNKNOWN");
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("reads current schedule cards without exposing CSRF fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(page("Schedule Search", card))));
    const data = await shuttleSchoolRequest("schedules", { date: "2026-11-14", route: 2 });
    expect(data.schedules).toMatchObject([
      {
        id: "3",
        date: "2026-11-14",
        departure: "08:30",
        arrival: "09:50",
        from: "TC Campus",
        to: "SIP Campus",
      },
    ]);
    expect(JSON.stringify(data)).not.toContain("test-csrf");
  });
  it("does not mistake a login response for an empty list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply("<title>Login</title>")));
    await expect(shuttleSchoolRequest("trips", {})).rejects.toThrow("AUTH_REQUIRED");
  });
  it("rejects unsupported operations before making requests", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(shuttleSchoolRequest("arbitrary-url", {})).rejects.toThrow("INVALID_INPUT");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("requires explicit confirmation for writes", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      shuttleSchoolRequest("book", { id: "3", date: "2026-11-14", route: 2 }),
    ).rejects.toThrow("CONFIRMATION_REQUIRED");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects a foreign form instead of posting its CSRF fields", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        reply(page("Schedule Search", card.replace(origin, "https://evil.example"))),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(
      shuttleSchoolRequest("schedules", { date: "2026-11-14", route: 2 }),
    ).rejects.toThrow("UNEXPECTED_RESPONSE");
  });
});
