import { expect, it, vi } from "vitest";
import { createSpaceHandlers } from "./handlers";
import { SpaceError } from "./rules";
import type { createSpaceService } from "./service";
function fixture() {
  const service = { book: vi.fn(), cancel: vi.fn(), listMine: vi.fn(), search: vi.fn() };
  return {
    service,
    handlers: createSpaceHandlers(service as ReturnType<typeof createSpaceService>),
  };
}
it("rejects request identity/status injection before persistence (SP-AC-05)", async () => {
  const f = fixture();
  const result = await f.handlers.POST(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        spaceId: "s",
        startsAt: "2026-11-02T02:00:00Z",
        endsAt: "2026-11-02T03:00:00Z",
        userId: "attacker",
        status: "CONFIRMED",
      }),
    }),
  );
  expect(result.status).toBe(400);
  expect(f.service.book).not.toHaveBeenCalled();
});
it("uses shared API error envelopes and 409 for conflicts (SP-AC-04)", async () => {
  const f = fixture();
  f.service.book.mockRejectedValue(new SpaceError("BOOKING_CONFLICT", "Seat already booked.", 409));
  const r = await f.handlers.POST(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        spaceId: "s",
        startsAt: "2026-11-02T02:00:00Z",
        endsAt: "2026-11-02T03:00:00Z",
      }),
    }),
  );
  expect(r.status).toBe(409);
  expect(await r.json()).toMatchObject({ error: { code: "CONFLICT" } });
});
