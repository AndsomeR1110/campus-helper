import { expect, it } from "vitest";
import { DEMO_SPACES } from "../demo-data";
import { toSpaceScheduleEvent } from "./schedule";

it("exports a UTC schedule DTO without exposing the owner (SP-AC-08)", () => {
  const event = toSpaceScheduleEvent(
    {
      id: "b1",
      spaceId: DEMO_SPACES[0].id,
      userId: "private",
      status: "CONFIRMED",
      startsAt: "2026-11-02T02:00:00Z",
      endsAt: "2026-11-02T03:00:00Z",
    },
    DEMO_SPACES[0],
  );
  expect(event).toMatchObject({
    id: "STUDY_SPACE:b1",
    type: "STUDY_SPACE",
    href: "/bookings/space-b1",
    startsAt: "2026-11-02T02:00:00Z",
  });
  expect(event).not.toHaveProperty("userId");
});
