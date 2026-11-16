// Runs only in the private official room-system WebView. Never returns tokens or raw responses.
type RoomRecord = Record<string, unknown>;
type RoomVm = {
  $axios: { get(path: string, options?: unknown): Promise<unknown> };
  $store: { state: { userInfo?: RoomRecord } };
};
function roomRuntime() {
  if (location.origin !== "https://roombookings.xjtlu.edu.cn") throw Error("INVALID_SCHOOL_PAGE");
  const vm = (document.querySelector("#app") as (Element & { __vue__?: RoomVm }) | null)?.__vue__;
  if (!vm?.$axios) throw Error("NOT_READY");
  return vm;
}
async function roomGet(path: string, params: RoomRecord = {}) {
  try {
    const response = await roomRuntime().$axios.get(path, { params });
    const envelope =
      response && typeof response === "object" && "code" in response
        ? response
        : (response as { data?: unknown })?.data;
    if (!envelope || typeof envelope !== "object" || !("code" in envelope))
      throw Error("GATEWAY_BLOCKED");
    const result = envelope as { code: number; data?: unknown };
    if (result.code === 300 || result.code === 401) throw Error("AUTH_REQUIRED");
    if (result.code !== 0) throw Error("SCHOOL_UNAVAILABLE");
    return result.data;
  } catch (error) {
    if ((error as { response?: { status?: number } })?.response?.status === 401)
      throw Error("AUTH_REQUIRED");
    if ((error as { response?: { status?: number } })?.response?.status === 403)
      throw Error("GATEWAY_BLOCKED");
    throw error;
  }
}
function roomRows(value: unknown): RoomRecord[] {
  if (!Array.isArray(value) || value.length > 500 || value.some((v) => !v || typeof v !== "object"))
    throw Error("INVALID_SCHOOL_DATA");
  return value;
}
function roomNumber(value: unknown, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw Error("INVALID_SCHOOL_DATA");
  return n;
}
function roomText(value: unknown, max = 100): string {
  if (typeof value !== "string" || !value || value.length > max) throw Error("INVALID_SCHOOL_DATA");
  return value;
}
function roomMinutes(value: unknown): number {
  const time = roomText(value, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error("INVALID_SCHOOL_DATA");
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}
function roomTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
export function normalizeRoomAvailability(
  raw: unknown,
  floorId: string,
  date: string,
  now: number,
) {
  const rows = roomRows(raw);
  if (!rows.length) return { availability: [], rules: null };
  const first = rows[0];
  const rule = first.resvRule as RoomRecord;
  if (!rule) throw Error("INVALID_SCHOOL_DATA");
  const step = roomNumber(rule.timeInterval, 1, 60);
  const rules = {
    minPeople: roomNumber(first.minUser, 1, 50),
    maxPeople: roomNumber(first.maxUser, 1, 50),
    minMinutes: roomNumber(rule.minResvTime, 1, 1440),
    maxMinutes: roomNumber(rule.maxResvTime, 1, 1440),
    stepMinutes: step,
    opensAt: roomText(first.openStart, 5),
    closesAt: roomText(first.openEnd, 5),
    maxDaysAhead: Math.floor(roomNumber(rule.earliestResvTime, 0, 43200) / 1440),
    noShowMinutes: rule.cancelTime == null ? null : roomNumber(rule.cancelTime, 0, 1440),
  };
  const availability = rows.map((row) => {
    if (
      Number(row.campusId) !== 2 ||
      String(row.labId) !== floorId ||
      !/Taicang|太仓/i.test(String(row.kindName))
    )
      throw Error("INVALID_SCHOOL_DATA");
    const ownRule = row.resvRule as RoomRecord;
    // The UI currently displays one rule set; never silently apply it to a room with different rules.
    for (const k of [
      "minResvTime",
      "maxResvTime",
      "timeInterval",
      "earliestResvTime",
      "cancelTime",
    ])
      if (!ownRule || ownRule[k] !== rule[k]) throw Error("UNSUPPORTED_ROOM_RULES");
    if (
      row.minUser !== first.minUser ||
      row.maxUser !== first.maxUser ||
      row.openStart !== first.openStart ||
      row.openEnd !== first.openEnd
    )
      throw Error("UNSUPPORTED_ROOM_RULES");
    const opens = roomMinutes(row.openStart),
      closes = roomMinutes(row.openEnd);
    if (closes <= opens || rules.minMinutes > rules.maxMinutes || rules.minPeople > rules.maxPeople)
      throw Error("INVALID_SCHOOL_DATA");
    // Match the official form: bit 128 is cancelled; class schedules still block the room.
    if (Number(ownRule.freezingTime ?? 0) !== 0) throw Error("UNSUPPORTED_ROOM_RULES");
    const reservations = [
      ...roomRows(row.resvInfo ?? []).filter((r) => (Number(r.resvStatus) & 128) === 0),
      ...roomRows(row.cls ?? []),
    ];
    const periods = reservations.map((r) => {
      const start = Date.parse(String(r.startTime ?? r.start).replace(" ", "T") + "+08:00");
      const end = Date.parse(String(r.endTime ?? r.end).replace(" ", "T") + "+08:00");
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
        throw Error("INVALID_SCHOOL_DATA");
      return { start, end };
    });
    const slots = [];
    for (let m = opens; m + step <= closes; m += step) {
      const start = roomTime(m),
        end = roomTime(m + step);
      const stamp = Date.parse(`${date}T${start}:00+08:00`),
        finish = Date.parse(`${date}T${end}:00+08:00`);
      const reason =
        row.onlyView || Number(row.openState) !== 0
          ? "CLOSED"
          : stamp <= now
            ? "PAST"
            : periods.some((p) => stamp < p.end && finish > p.start)
              ? "BOOKED"
              : undefined;
      slots.push({ start, end, available: !reason, ...(reason ? { reason } : {}) });
    }
    return {
      room: {
        id: String(roomNumber(row.devId, 1, 2147483647)),
        name: roomText(row.devName),
        floorId,
        capacity: rules.maxPeople,
      },
      slots,
    };
  });
  return { rules, availability };
}
async function roomSession() {
  const data = await roomGet("/auth/userInfo");
  const info = (
    data && typeof data === "object" ? data : roomRuntime().$store.state.userInfo
  ) as RoomRecord;
  const selfId = info?.logonName;
  if (typeof selfId !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(selfId))
    throw Error("AUTH_REQUIRED");
  return { authenticated: true, selfId };
}
async function roomFloors() {
  const menu = roomRows(await roomGet("/roomMenu"));
  const group = menu.find((r) => /Taicang|太仓/i.test(String(r.name ?? r.kindName)));
  if (!group) throw Error("INVALID_SCHOOL_DATA");
  const children = roomRows(group.children ?? group.labList ?? []);
  if (!children.length) throw Error("INVALID_SCHOOL_DATA");
  return children.map((r) => ({
    id: String(roomNumber(r.id ?? r.labId, 1, 2147483647)),
    label: roomText(r.name ?? r.labName, 30),
  }));
}
export async function roomsSchoolRequest(operation: string, input: RoomRecord) {
  if (operation === "session") return roomSession();
  const { selfId } = await roomSession();
  if (operation === "floors") return { floors: await roomFloors(), selfId };
  if (operation === "availability" || operation === "prepare") {
    const date = roomText(input.date, 10),
      floorId = String(roomNumber(input.floorId, 1, 2147483647));
    const dayStamp = Date.parse(`${date}T12:00:00+08:00`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(dayStamp) ||
      new Date(dayStamp).toISOString().slice(0, 10) !== date
    )
      throw Error("INVALID_INPUT");
    const floors = await roomFloors();
    if (!floors.some((f) => f.id === floorId)) throw Error("INVALID_INPUT");
    const raw = await roomGet("/reserve", {
      sysKind: 1,
      resvDates: date.replaceAll("-", ""),
      page: 1,
      pageSize: 100,
      labIds: floorId,
      kindId: "",
    });
    const normalized = normalizeRoomAvailability(raw, floorId, date, Date.now());
    if (operation === "availability") return { ...normalized, selfId };
    const room = normalized.availability.find((r) => r.room.id === input.roomId);
    const rules = normalized.rules;
    const localToday = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
    const ahead = (dayStamp - Date.parse(`${localToday}T12:00:00+08:00`)) / 86400000;
    if (!rules || ahead < 0 || ahead > rules.maxDaysAhead) throw Error("INVALID_INPUT");
    const minutes = roomNumber(input.minutes, 1, 1440),
      start = roomText(input.start, 5),
      begin = roomMinutes(start);
    if (
      !room ||
      !rules ||
      minutes < rules.minMinutes ||
      minutes > rules.maxMinutes ||
      minutes % rules.stepMinutes
    )
      throw Error("INVALID_INPUT");
    for (let m = begin; m < begin + minutes; m += rules.stepMinutes)
      if (!room.slots.some((s) => s.start === roomTime(m) && s.available)) throw Error("CONFLICT");
    const members = input.memberIds;
    if (
      !Array.isArray(members) ||
      members.length + 1 < rules.minPeople ||
      members.length + 1 > rules.maxPeople
    )
      throw Error("INVALID_GROUP");
    const seen = new Set([selfId.toLowerCase()]);
    const ownAccount = roomRuntime().$store.state.userInfo?.accNo;
    if (ownAccount == null) throw Error("AUTH_REQUIRED");
    const resolvedMembers = new Set([String(ownAccount)]);
    for (const member of members) {
      if (
        typeof member !== "string" ||
        !/^[A-Za-z0-9._-]{3,64}$/.test(member) ||
        seen.has(member.toLowerCase())
      )
        throw Error("INVALID_GROUP");
      const found = roomRows(
        await roomGet("/account/getMembers", { key: member, page: 1, pageNum: 10 }),
      );
      const exact = found.filter((r) => String(r.logonName).toLowerCase() === member.toLowerCase());
      if (
        exact.length !== 1 ||
        !exact[0].accNo ||
        Number(exact[0].localstatus ?? 0) !== 0 ||
        Number(exact[0].status ?? 0) !== 0 ||
        resolvedMembers.has(String(exact[0].accNo))
      )
        throw Error("INVALID_GROUP");
      seen.add(member.toLowerCase());
      resolvedMembers.add(String(exact[0].accNo));
    }
    // Deliberately no POST in this integration: user authorized preflight, not a real reservation.
    return {
      kind: "prepared",
      message: "Room, time and group checked. No reservation was submitted.",
    };
  }
  if (operation === "reservations") {
    const date = new Date();
    const beginDate = date.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
    const endDate = new Date(date.getTime() + 7 * 86400000).toLocaleDateString("sv-SE", {
      timeZone: "Asia/Shanghai",
    });
    const rows = roomRows(
      await roomGet("/reserve/resvInfo", {
        beginDate,
        endDate,
        needStatus: 8582,
        page: 1,
        pageNum: 100,
        orderKey: "gmt_create",
        orderModel: "desc",
      }),
    );
    // Nonempty status bitmasks require verified mapping before presenting a confirmed/cancellable booking.
    if (rows.length) throw Error("UNSUPPORTED_RESERVATION_STATE");
    return { reservations: [] };
  }
  throw Error("INVALID_OPERATION");
}
