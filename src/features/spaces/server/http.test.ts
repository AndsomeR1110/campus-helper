import { expect, it, vi } from "vitest";
import { spaceResponse } from "./http";
it("rejects cross-origin mutations before calling handlers and never caches personal data", async () => {
  const action = vi.fn(async () => new Response("ok"));
  const denied = await spaceResponse(
    new Request("https://campus.test/api/space-bookings", {
      method: "POST",
      headers: { origin: "https://other.test" },
    }),
    action,
  );
  expect(denied.status).toBe(403);
  expect(action).not.toHaveBeenCalled();
  const allowed = await spaceResponse(
    new Request("https://campus.test/api/space-bookings", {
      method: "POST",
      headers: { origin: "https://campus.test" },
    }),
    action,
  );
  expect(allowed.status).toBe(200);
  expect(allowed.headers.get("cache-control")).toContain("no-store");
});
it("uses the public Host when Next constructs an internal request URL", async () => {
  const action = vi.fn(async () => new Response("ok"));
  const response = await spaceResponse(
    new Request("http://localhost:3107/api/space-bookings", {
      method: "POST",
      headers: { host: "127.0.0.1:3107", origin: "http://127.0.0.1:3107" },
    }),
    action,
  );
  expect(response.status).toBe(200);
  expect(action).toHaveBeenCalledOnce();
});
