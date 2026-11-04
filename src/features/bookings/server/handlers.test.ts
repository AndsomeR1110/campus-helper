import { expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { BookingSourceUnavailable, type createBookingsService } from "./service";
import { cancelBookingResponse } from "./handlers";
const request = (origin = "http://public.test") =>
  new Request("http://localhost:3108/api/bookings/space-b1/cancel", {
    method: "POST",
    headers: { host: "public.test", origin },
  });
function fixture() {
  const cancel = vi.fn(async () => {});
  return {
    cancel,
    service: { cancel } as Pick<ReturnType<typeof createBookingsService>, "cancel">,
  };
}
it("uses no-store, validates origin and returns confirmed cancellation only after success (SP-AC-06)", async () => {
  const f = fixture();
  const ok = await cancelBookingResponse(request(), "space-b1", f.service);
  expect(ok.status).toBe(200);
  expect(ok.headers.get("cache-control")).toContain("no-store");
  f.cancel.mockClear();
  expect(
    (await cancelBookingResponse(request("https://other.test"), "space-b1", f.service)).status,
  ).toBe(403);
  expect(f.cancel).not.toHaveBeenCalled();
});
it("preserves missing-provider and owner errors in the API envelope (OH-AC-08, SP-AC-08)", async () => {
  const f = fixture();
  f.cancel.mockRejectedValue(new BookingSourceUnavailable());
  const unavailable = await cancelBookingResponse(request(), "office-b1", f.service);
  expect(unavailable.status).toBe(503);
  expect(await unavailable.json()).toMatchObject({ error: { code: "BOOKING_SOURCE_UNAVAILABLE" } });
  f.cancel.mockRejectedValue(new ApiError("NOT_FOUND", "Booking not found."));
  expect((await cancelBookingResponse(request(), "space-foreign", f.service)).status).toBe(404);
});
