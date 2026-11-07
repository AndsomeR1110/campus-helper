// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildSlotCancelledNotification } from "./notify";

const context = {
  slotId: "slot-1",
  // 2026-11-12 14:00 Asia/Shanghai == 06:00Z
  startsAt: new Date("2026-11-12T06:00:00.000Z"),
  teacherName: "Prof. Smith",
};

describe("buildSlotCancelledNotification", () => {
  it("builds an OFFICE_HOUR_CANCELLED notification (OH-AC-07)", () => {
    const notification = buildSlotCancelledNotification(context, "booking-1");

    expect(notification.type).toBe("OFFICE_HOUR_CANCELLED");
    expect(notification.title).toBe("Office hour cancelled");
    expect(notification.href).toBe("/office-hours/slot-1");
  });

  it("states who cancelled and when, in Asia/Shanghai time", () => {
    const { body } = buildSlotCancelledNotification(context, "booking-1");

    expect(body).toContain("Prof. Smith");
    expect(body).toContain("14:00"); // 06:00Z rendered in UTC+8
    expect(body).toContain("12 Nov");
    expect(body).toContain("has been cancelled");
  });

  it("derives a dedupeKey from the booking, so re-booking then cancelling notifies again", () => {
    const first = buildSlotCancelledNotification(context, "booking-1");
    const again = buildSlotCancelledNotification(context, "booking-1");
    const rebooked = buildSlotCancelledNotification(context, "booking-2");

    expect(first.dedupeKey).toBe(again.dedupeKey); // same booking -> same key (unique column)
    expect(rebooked.dedupeKey).not.toBe(first.dedupeKey);
    expect(first.dedupeKey).toBe("office-slot:slot-1:booking-1:cancelled");
  });
});
