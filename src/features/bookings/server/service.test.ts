import { expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { Actor } from "@/features/spaces";
import type { BookingRecord } from "../types";
import { createBookingsService, type BookingSource } from "./service";
const user: Actor = { id: "mia", role: "STUDENT" };
const record: BookingRecord = {
  sourceId: "same-id",
  title: "Seat E-02",
  startsAt: "2026-11-06T02:00:00Z",
  endsAt: "2026-11-06T03:00:00Z",
  status: "CONFIRMED",
  location: "Demo Library East",
};
function source(rows: BookingRecord[]): BookingSource {
  return { list: vi.fn(async () => rows), cancel: vi.fn(async () => {}) };
}
const now = () => new Date("2026-11-05T00:00:00Z");
it("merges both adapter fixtures in order without source ID collisions or identity leaks (OH-AC-08, SP-AC-08)", async () => {
  // These are local unit fixtures, not M2's real BookingSummary or provider.
  const seats = source([{ ...record, ...{ userId: "private" } }]);
  const office = source([
    { ...record, title: "Fictional teacher fixture", startsAt: "2026-11-06T01:00:00Z" },
  ]);
  const s = createBookingsService({
    actor: async () => user,
    sources: { space: seats, office },
    now,
  });
  const result = await s.listMine();
  expect(result.unavailable).toEqual([]);
  expect(result.bookings.map((b) => b.id)).toEqual(["office-same-id", "space-same-id"]);
  expect(result.bookings[1]).not.toHaveProperty("userId");
  expect(seats.list).toHaveBeenCalledWith(user);
  expect(office.list).toHaveBeenCalledWith(user);
  expect(await s.detail("office-same-id")).toMatchObject({
    kind: "office",
    href: "/bookings/office-same-id",
  });
});
it("marks missing and failed sources unavailable rather than reporting empty complete results (OH-AC-08)", async () => {
  const seats = source([record]);
  const s = createBookingsService({
    actor: async () => user,
    sources: { space: seats, office: null },
    now,
  });
  expect((await s.listMine()).unavailable).toEqual(["office"]);
  await expect(s.detail("office-same-id")).rejects.toMatchObject({ status: 503 });
  await expect(s.cancel("office-same-id")).rejects.toMatchObject({ status: 503 });
  vi.mocked(seats.list).mockRejectedValue(new Error("private database details"));
  expect((await s.listMine()).unavailable).toEqual(["office", "space"]);
});
it("rejects signed-out access before calling any provider (AUTH-AC-03)", async () => {
  const seats = source([record]);
  const s = createBookingsService({
    actor: async () => null,
    sources: { space: seats, office: null },
    now,
  });
  await expect(s.listMine()).rejects.toMatchObject({ status: 401 });
  await expect(s.detail("space-same-id")).rejects.toMatchObject({ status: 401 });
  await expect(s.cancel("space-same-id")).rejects.toMatchObject({ status: 401 });
  expect(seats.list).not.toHaveBeenCalled();
});
it("never cancels an invisible record, a started record or a cancelled record (SP-AC-06)", async () => {
  const seats = source([record]);
  const s = createBookingsService({
    actor: async () => user,
    sources: { space: seats, office: null },
    now,
  });
  expect(await s.detail("space-foreign")).toBeNull();
  expect(await s.detail("bad/id")).toBeNull();
  await expect(s.cancel("space-foreign")).rejects.toMatchObject({ status: 404 });
  for (const changed of [
    { ...record, status: "CANCELLED" as const },
    { ...record, startsAt: "2026-11-04T02:00:00Z" },
  ]) {
    vi.mocked(seats.list).mockResolvedValue([changed]);
    await expect(s.cancel("space-same-id")).rejects.toMatchObject({ status: 409 });
  }
  expect(seats.cancel).not.toHaveBeenCalled();
});
it("dispatches cancellation only to the owned source and propagates a failure (OH-AC-08, SP-AC-06)", async () => {
  const seats = source([record]),
    office = source([record]);
  const s = createBookingsService({
    actor: async () => user,
    sources: { space: seats, office },
    now,
  });
  await s.cancel("space-same-id");
  expect(seats.cancel).toHaveBeenCalledWith(user, "same-id");
  expect(office.cancel).not.toHaveBeenCalled();
  vi.mocked(office.cancel).mockRejectedValue(new Error("failed"));
  await expect(s.cancel("office-same-id")).rejects.toThrow("failed");
});
it("does not conceal provider authorization failures as empty data (AUTH-AC-04)", async () => {
  const seats = source([]);
  vi.mocked(seats.list).mockRejectedValue(new ApiError("FORBIDDEN", "Forbidden"));
  await expect(
    createBookingsService({
      actor: async () => user,
      sources: { space: seats, office: null },
      now,
    }).listMine(),
  ).rejects.toMatchObject({ status: 403 });
});
