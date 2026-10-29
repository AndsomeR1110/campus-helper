import { expect, it } from "vitest";
import { DEMO_SPACES, type SpaceBooking } from "@/features/spaces";
import { createBookingsService, toSpaceBookingItem } from "./service";

const row: SpaceBooking = {
  id: "same",
  userId: "a",
  spaceId: "demo-seat-1",
  status: "CONFIRMED",
  startsAt: "2026-11-02T02:00:00Z",
  endsAt: "2026-11-02T03:00:00Z",
};

it("maps seat bookings and merges authenticated sources in time order (SP-AC-08)", async () => {
  const seat = toSpaceBookingItem(row, DEMO_SPACES[0]);
  const office = {
    ...seat,
    id: "office-same",
    type: "OFFICE_HOUR" as const,
    title: "Demo teacher",
    startsAt: "2026-11-02T01:00:00Z",
    href: "/bookings/office-same",
  };
  const service = createBookingsService({
    listSpaces: async () => [seat],
    listOfficeHours: async () => [office],
  });
  expect((await service.listMine()).map((b) => b.id)).toEqual(["office-same", "space-same"]);
  expect(await service.detail("space-same")).toEqual(seat);
  expect(await service.detail("other-users-booking")).toBeNull();
  expect(seat).not.toHaveProperty("userId");
  expect(() => toSpaceBookingItem(row, DEMO_SPACES[1])).toThrow();
});

it("propagates missing Office Hour source instead of presenting an incomplete list as complete (SP-AC-08)", async () => {
  const service = createBookingsService({
    listSpaces: async () => [],
    listOfficeHours: async () => {
      throw new Error("source unavailable");
    },
  });
  await expect(service.listMine()).rejects.toThrow("source unavailable");
});
