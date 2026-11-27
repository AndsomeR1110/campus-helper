import { afterEach, expect, it, vi } from "vitest";
import { roomsSchoolRequest } from "./school-adapter";
const booking = {
  floorId: "2",
  roomId: "13",
  date: "2026-11-17",
  start: "10:00",
  minutes: 60,
  memberIds: ["other.ab24"],
};
const own = {
  uuid: "fictional-reservation",
  classKind: 1,
  appAccNo: 11,
  resvStatus: 8195,
  resvBeginTime: "2026-11-17 10:00:00",
  resvEndTime: "2026-11-17 11:00:00",
  resvDevInfoList: [{ devId: 13, labId: 2, devName: "Room A", labName: "1F" }],
  resvMemberInfoList: [{ accNo: 11 }, { accNo: 22 }],
};
function fixture() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T09:00:00+08:00"));
  vi.stubGlobal("location", new URL("https://roombookings.xjtlu.edu.cn/mobile.html"));
  document.body.innerHTML = '<div id="app"></div>';
  let records: unknown[] = [];
  const get = vi.fn(async (path: string) => ({
    code: 0,
    data:
      path === "/auth/userInfo"
        ? { accNo: 11, logonName: "self.ab24" }
        : path === "/roomMenu"
          ? [{ name: "Taicang Group Study Room", children: [{ id: 2, name: "1F" }] }]
          : path === "/account/getMembers"
            ? [{ accNo: 22, logonName: "other.ab24", status: 0, localstatus: 0 }]
            : path === "/reserve"
              ? [
                  {
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
                    resvRule: {
                      minResvTime: 30,
                      maxResvTime: 180,
                      timeInterval: 5,
                      earliestResvTime: 4320,
                      cancelTime: 30,
                    },
                    resvInfo: [],
                  },
                ]
              : records,
  }));
  const post = vi.fn(async (path: string) => {
    records = path === "/reserve" ? [own] : [{ ...own, resvStatus: 128 }];
    return { data: { code: 0, data: null } };
  });
  Object.assign(document.querySelector("#app")!, {
    __vue__: {
      $axios: { get, post },
      $store: {
        state: {
          sysConfig: { resvCode: "0", resvmemo: "0" },
          userInfo: { accNo: 11, logonName: "self.ab24" },
        },
      },
    },
  });
  return {
    get,
    post,
    setRecords: (r: unknown[]) => {
      records = r;
    },
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = "";
});
it("posts the official payload once then confirms only a matching own server record", async () => {
  const api = fixture();
  const result = await roomsSchoolRequest("book", booking);
  expect(result).toMatchObject({
    kind: "awaiting",
    reservation: { id: own.uuid, status: "AWAITING" },
  });
  expect(api.post).toHaveBeenCalledExactlyOnceWith(
    "/reserve",
    expect.objectContaining({
      sysKind: 1,
      appAccNo: 11,
      memberKind: 2,
      resvBeginTime: "2026-11-17 10:00:00",
      resvEndTime: "2026-11-17 11:00:00",
      resvDev: [13],
      resvMember: [11, 22],
      resvKind: 2,
      resvProperty: 0,
    }),
  );
  expect(JSON.stringify(result)).not.toMatch(/accNo|logonName|other.ab24/);
});
it("never retries a lost POST response", async () => {
  const api = fixture();
  api.post.mockRejectedValue(Error("lost response"));
  await expect(roomsSchoolRequest("book", booking)).resolves.toEqual({ kind: "unknown" });
  expect(api.post).toHaveBeenCalledOnce();
});
it("does not report success from an acknowledgement without a matching saved record", async () => {
  const api = fixture();
  api.post.mockResolvedValue({ data: { code: 0, data: null } });
  await expect(roomsSchoolRequest("book", booking)).resolves.toEqual({ kind: "unknown" });
});
it("does not submit if this exact booking already exists", async () => {
  const api = fixture();
  api.setRecords([own]);
  await expect(roomsSchoolRequest("book", booking)).rejects.toThrow("ALREADY_BOOKED");
  expect(api.post).not.toHaveBeenCalled();
});
it("cancels only a freshly verified booking owned by the authenticated applicant", async () => {
  const api = fixture();
  api.setRecords([own]);
  await expect(roomsSchoolRequest("cancel", { reservationId: own.uuid })).resolves.toEqual({
    kind: "cancelled",
  });
  expect(api.post).toHaveBeenCalledExactlyOnceWith("/reserve/delete", { uuid: own.uuid });
});
it.each([
  { ...own, appAccNo: 99 },
  { ...own, resvStatus: 4 },
  { ...own, resvStatus: 128 },
])("does not cancel another applicant or noncancellable state", async (record) => {
  const api = fixture();
  api.setRecords([record]);
  await expect(roomsSchoolRequest("cancel", { reservationId: own.uuid })).rejects.toThrow(
    "NOT_CANCELLABLE",
  );
  expect(api.post).not.toHaveBeenCalled();
});
it("leaves a lost cancellation response unknown without retrying", async () => {
  const api = fixture();
  api.setRecords([own]);
  api.post.mockRejectedValue(Error("lost"));
  await expect(roomsSchoolRequest("cancel", { reservationId: own.uuid })).resolves.toEqual({
    kind: "unknown",
  });
  expect(api.post).toHaveBeenCalledOnce();
});
it("does not call a finished record cancelled or expose unrelated reservations", async () => {
  const api = fixture();
  api.setRecords([
    { ...own, resvStatus: 128 },
    { ...own, resvDevInfoList: [{ devId: 1, labId: 99 }] },
  ]);
  await expect(roomsSchoolRequest("reservations", {})).resolves.toEqual({
    reservations: [],
    unsupportedCount: 0,
  });
});
it("keeps rejected/unknown school statuses out of confirmed bookings", async () => {
  const api = fixture();
  api.setRecords([{ ...own, resvStatus: 513 }]);
  await expect(roomsSchoolRequest("reservations", {})).resolves.toEqual({
    reservations: [],
    unsupportedCount: 1,
  });
});
it("blocks a room requiring official reservation verification before dispatch", async () => {
  const api = fixture();
  (
    document.querySelector("#app") as unknown as {
      __vue__: { $store: { state: { sysConfig: { resvCode: string } } } };
    }
  ).__vue__.$store.state.sysConfig.resvCode = "2";
  await expect(roomsSchoolRequest("book", booking)).rejects.toThrow("UNSUPPORTED_ROOM_RULES");
  expect(api.post).not.toHaveBeenCalled();
});
it("reconciles a lost booking result with reads only", async () => {
  const api = fixture();
  api.setRecords([own]);
  await expect(roomsSchoolRequest("reconcileBook", booking)).resolves.toMatchObject({
    kind: "awaiting",
  });
  expect(api.post).not.toHaveBeenCalled();
});
it("does not call a missing cancellation result a confirmed cancellation", async () => {
  const api = fixture();
  await expect(roomsSchoolRequest("reconcileCancel", { reservationId: own.uuid })).resolves.toEqual(
    { kind: "not-active" },
  );
  expect(api.post).not.toHaveBeenCalled();
});
it("does not infer absence from a full reservation page", async () => {
  const api = fixture();
  api.setRecords(Array.from({ length: 100 }, () => own));
  await expect(roomsSchoolRequest("cancel", { reservationId: own.uuid })).rejects.toThrow(
    "INCOMPLETE_RESERVATIONS",
  );
  expect(api.post).not.toHaveBeenCalled();
});
it("never treats two missing applicant IDs as matching ownership", async () => {
  const api = fixture();
  const vm = (
    document.querySelector("#app") as unknown as {
      __vue__: { $store: { state: { userInfo: Record<string, unknown> } } };
    }
  ).__vue__;
  delete vm.$store.state.userInfo.accNo;
  api.setRecords([{ ...own, appAccNo: undefined }]);
  await expect(roomsSchoolRequest("cancel", { reservationId: own.uuid })).rejects.toThrow(
    "AUTH_REQUIRED",
  );
  expect(api.post).not.toHaveBeenCalled();
});
