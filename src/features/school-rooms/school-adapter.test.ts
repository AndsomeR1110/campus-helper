import { afterEach, expect, it, vi } from "vitest";
import { normalizeRoomAvailability, roomsSchoolRequest } from "./school-adapter";
const row = {
  campusId: 2,
  labId: 2,
  kindName: "Taicang Group Study Room",
  devId: 13,
  devName: "Room A",
  minUser: 2,
  maxUser: 5,
  openStart: "08:00",
  openEnd: "22:00",
  openState: 0,
  onlyView: false,
  resvRule: {
    minResvTime: 30,
    maxResvTime: 180,
    timeInterval: 5,
    earliestResvTime: 4320,
    cancelTime: 30,
  },
  resvInfo: [
    {
      startTime: "2026-11-16 09:00:00",
      endTime: "2026-11-16 10:00:00",
      resvStatus: 1027,
      privateIdentity: "never return",
    },
  ],
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = "";
});
function schoolFixture() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T09:00:00+08:00"));
  vi.stubGlobal("location", new URL("https://roombookings.xjtlu.edu.cn/mobile.html"));
  document.body.innerHTML = '<div id="app"></div>';
  const post = vi.fn();
  const get = vi.fn(async (path: string) => ({
    data: {
      code: 0,
      data:
        path === "/auth/userInfo"
          ? { logonName: "student.ab24", token: "must-not-cross-bridge" }
          : path === "/roomMenu"
            ? [{ name: "Taicang Group Study Room", children: [{ id: 2, name: "1F" }] }]
            : path === "/reserve"
              ? [row]
              : [{ logonName: "other.ab24", accNo: "internal-id", status: 0, localstatus: 0 }],
    },
  }));
  Object.assign(document.querySelector("#app")!, {
    __vue__: {
      $axios: { get, post },
      $store: { state: { userInfo: { logonName: "student.ab24", accNo: "self-internal" } } },
    },
  });
  return { get, post };
}
it("prepares a verified group with GETs only and never returns internal member IDs or tokens", async () => {
  const api = schoolFixture();
  const result = await roomsSchoolRequest("prepare", {
    floorId: "2",
    date: "2026-11-17",
    roomId: "13",
    start: "10:00",
    minutes: 60,
    memberIds: ["other.ab24"],
  });
  expect(result).toMatchObject({ kind: "prepared" });
  expect(api.get).toHaveBeenCalledWith("/reserve", {
    params: expect.objectContaining({ resvDates: "20261117", labIds: "2" }),
  });
  expect(api.get).toHaveBeenCalledWith("/account/getMembers", {
    params: expect.objectContaining({ key: "other.ab24" }),
  });
  expect(api.post).not.toHaveBeenCalled();
  expect(JSON.stringify(result)).not.toMatch(/internal-id|must-not-cross-bridge/);
});
it("never accepts the applicant as a second member", async () => {
  schoolFixture();
  await expect(
    roomsSchoolRequest("prepare", {
      floorId: "2",
      date: "2026-11-17",
      roomId: "13",
      start: "10:00",
      minutes: 60,
      memberIds: ["STUDENT.AB24"],
    }),
  ).rejects.toThrow("INVALID_GROUP");
});
it("classifies gateway HTML separately from zero rooms", async () => {
  const api = schoolFixture();
  api.get.mockResolvedValueOnce({ data: "<html>Gateway</html>" } as never);
  await expect(roomsSchoolRequest("session", {})).rejects.toThrow("GATEWAY_BLOCKED");
});
it("uses school granularity and late-arrival rules, with exact blocked periods", () => {
  const result = normalizeRoomAvailability(
    [row],
    "2",
    "2026-11-16",
    Date.parse("2026-11-16T08:30:00+08:00"),
  );
  expect(result.rules).toMatchObject({
    stepMinutes: 5,
    maxDaysAhead: 3,
    noShowMinutes: 30,
    minMinutes: 30,
  });
  const slots = result.availability[0].slots;
  expect(slots.find((s) => s.start === "08:30")?.reason).toBe("PAST");
  expect(slots.find((s) => s.start === "09:55")?.reason).toBe("BOOKED");
  expect(slots.find((s) => s.start === "10:00")?.available).toBe(true);
  expect(JSON.stringify(result)).not.toContain("privateIdentity");
});
it("rejects a different campus rather than mixing it into Taicang results", () => {
  expect(() => normalizeRoomAvailability([{ ...row, campusId: 1 }], "2", "2026-11-16", 0)).toThrow(
    "INVALID_SCHOOL_DATA",
  );
});
it("does not apply one room's rules to another room", () => {
  expect(() =>
    normalizeRoomAvailability(
      [row, { ...row, resvRule: { ...row.resvRule, maxResvTime: 60 } }],
      "2",
      "2026-11-16",
      0,
    ),
  ).toThrow("UNSUPPORTED_ROOM_RULES");
});
it("excludes cancelled bookings while retaining class schedule blocks", () => {
  const result = normalizeRoomAvailability(
    [
      {
        ...row,
        resvInfo: row.resvInfo.map((r) => ({ ...r, resvStatus: 128 })),
        cls: [{ start: "2026-11-16 11:00:00", end: "2026-11-16 12:00:00" }],
      },
    ],
    "2",
    "2026-11-16",
    0,
  );
  expect(result.availability[0].slots.find((s) => s.start === "09:30")?.available).toBe(true);
  expect(result.availability[0].slots.find((s) => s.start === "11:30")?.reason).toBe("BOOKED");
});
it("reports a real empty response as empty without invented rules", () => {
  expect(normalizeRoomAvailability([], "2", "2026-11-16", 0)).toEqual({
    availability: [],
    rules: null,
  });
});
