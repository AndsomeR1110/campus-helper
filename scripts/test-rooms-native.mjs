// Device-only integration test. All private WebView requests are intercepted; no school writes.
import { execFileSync } from "node:child_process";
const actorId = process.env.ROOMS_TEST_ACTOR;
if (!actorId) throw Error("Set ROOMS_TEST_ACTOR to the signed-in fixture App actor");
const adb = process.env.ROOMS_TEST_ADB;
if (!adb)
  throw Error(
    "Set ROOMS_TEST_ADB to adb.exe; cleanup stops the test app before detaching interception",
  );
const targets = await (await fetch("http://127.0.0.1:9225/json/list")).json();
async function cdp(t) {
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  const handlers = new Map();
  ws.onmessage = async (e) => {
    const m = JSON.parse(e.data);
    if (m.id) {
      pending.get(m.id)?.(m);
      pending.delete(m.id);
    } else await handlers.get(m.method)?.(m.params);
  };
  const send = (method, params) =>
    new Promise((r) => {
      pending.set(++id, r);
      ws.send(JSON.stringify({ id, method, params }));
    });
  return {
    ws,
    send,
    handlers,
    eval: async (expression) => {
      const r = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (r.result?.exceptionDetails) throw Error("Runtime evaluation failed");
      return r.result?.result?.value;
    },
  };
}
const app = await cdp(
  targets.find((t) => t.type === "page" && t.url.startsWith("http://localhost:3000")),
);
const caps = await app.eval("window.Capacitor.Plugins.SchoolRooms.getCapabilities()");
if (caps?.writesEnabled !== true) throw Error("Test build writes not enabled");
const room = await cdp(
  targets.find((t) => t.url.startsWith("https://roombookings.xjtlu.edu.cn/mobile.html")),
);
const self = await room.eval(
  '(()=>{const u=document.querySelector("#app").__vue__.$store.state.userInfo;return {accNo:u.accNo,logonName:u.logonName}})()',
);
await room.eval(
  'document.querySelector("#app").__vue__.$store.state.sysConfig={resvCode:"0",resvmemo:"0"};true',
);
const date = await room.eval("new Date(Date.now()+86400000+8*3600000).toISOString().slice(0,10)");
const floor = { id: 2, name: "1F" },
  resv = {
    uuid: "fixture-booking",
    classKind: 1,
    appAccNo: self.accNo,
    resvStatus: 8195,
    resvBeginTime: date + " 10:00:00",
    resvEndTime: date + " 11:00:00",
    resvDevInfoList: [{ devId: 13, labId: 2, devName: "Fixture room", labName: "1F" }],
    resvMemberInfoList: [{ accNo: self.accNo }, { accNo: 999999999 }],
  };
let records = process.env.ROOM_QA_PHASE === "resume" ? [resv] : [],
  postCount = 0,
  blockedOther = 0;
room.handlers.set("Fetch.requestPaused", async (p) => {
  const u = new URL(p.request.url),
    path = u.pathname.replace(/^\/ic-web/, "");
  let data;
  if (p.request.method === "POST") {
    if (path === "/reserve") {
      postCount++;
      records = [resv];
      await room.send("Fetch.fulfillRequest", {
        requestId: p.requestId,
        responseCode: 503,
        responseHeaders: [{ name: "Content-Type", value: "text/html" }],
        body: Buffer.from("fixture: response lost after server accept").toString("base64"),
      });
      return;
    } else if (path === "/reserve/delete") {
      postCount++;
      records = [{ ...resv, resvStatus: 128 }];
      data = null;
    } else {
      blockedOther++;
      await room.send("Fetch.failRequest", {
        requestId: p.requestId,
        errorReason: "BlockedByClient",
      });
      return;
    }
  } else if (path === "/auth/userInfo") data = self;
  else if (path === "/roomMenu") data = [{ name: "Taicang Group Study Room", children: [floor] }];
  else if (path === "/account/getMembers")
    data = [{ logonName: "fixture.member", accNo: 999999999, status: 0, localstatus: 0 }];
  else if (path === "/reserve")
    data = [
      {
        campusId: 2,
        labId: 2,
        kindName: "Taicang Group Study Room",
        devId: 13,
        devName: "Fixture room",
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
    ];
  else if (path === "/reserve/resvInfo") data = records;
  else {
    blockedOther++;
    await room.send("Fetch.failRequest", {
      requestId: p.requestId,
      errorReason: "BlockedByClient",
    });
    return;
  }
  await room.send("Fetch.fulfillRequest", {
    requestId: p.requestId,
    responseCode: 200,
    responseHeaders: [{ name: "Content-Type", value: "application/json" }],
    body: Buffer.from(JSON.stringify({ code: 0, data })).toString("base64"),
  });
});
await room.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
const invoke = (operation, input = {}, confirmed = false) =>
  app.eval(
    "(async()=>{try{return await window.Capacitor.Plugins.SchoolRooms.invoke(" +
      JSON.stringify({ actorId, operation, input, confirmed, operationId: crypto.randomUUID() }) +
      ")}catch(e){return {error:e.code}}})()",
  );
try {
  const draft = {
    floorId: "2",
    roomId: "13",
    date,
    start: "10:00",
    minutes: 60,
    memberIds: ["fixture.member"],
  };
  const result =
    process.env.ROOM_QA_PHASE === "resume"
      ? { kind: "unknown" }
      : await invoke("book", draft, true);
  if (result?.kind !== "unknown") throw Error("Expected unknown write");
  const pending = await invoke("pending"),
    duplicate = await invoke("book", draft, true);
  if (
    !pending.pending ||
    duplicate.error !== "RESULT_UNKNOWN" ||
    postCount !== (process.env.ROOM_QA_PHASE === "resume" ? 0 : 1)
  )
    throw Error("Replay prevention failed");
  if (process.env.ROOM_QA_PHASE === "leave") {
    console.log(
      JSON.stringify({
        journalPending: pending.pending,
        replay: duplicate.error,
        interceptedPosts: postCount,
        realSchoolPostsSent: 0,
      }),
    );
  } else {
    const reconciled = await invoke("reconcile");
    if (reconciled.kind !== "awaiting") throw Error("Read-only reconciliation failed");
    const cancelled = await invoke("cancel", { reservationId: "fixture-booking" }, true);
    if (
      cancelled.kind !== "cancelled" ||
      postCount !== (process.env.ROOM_QA_PHASE === "resume" ? 1 : 2)
    )
      throw Error("Cancellation failed");
    const foreign = await invoke("cancel", { reservationId: "not-owned" }, true);
    if (
      foreign.error !== "NOT_CANCELLABLE" ||
      postCount !== (process.env.ROOM_QA_PHASE === "resume" ? 1 : 2)
    )
      throw Error("Ownership guard failed");
    const clean = await invoke("pending");
    if (clean.pending) throw Error("Journal not cleared");
    console.log(
      JSON.stringify({
        nativeMock: {
          booking: result.kind,
          replay: duplicate.error,
          reconciliation: reconciled.kind,
          cancel: cancelled.kind,
          foreign: foreign.error,
          journalPending: clean.pending,
        },
        interceptedPosts: postCount,
        unrecognizedRequestsBlocked: blockedOther,
        realSchoolPostsSent: 0,
      }),
    );
  }
} finally {
  // Destroy the private renderer before detaching Fetch: never resume an outstanding POST.
  execFileSync(
    adb,
    [
      "-P",
      process.env.ROOMS_TEST_ADB_PORT ?? "5038",
      "-s",
      process.env.ROOMS_TEST_SERIAL ?? "127.0.0.1:16384",
      "shell",
      "am",
      "force-stop",
      "live.anran.campushelper",
    ],
    { stdio: "ignore" },
  );
  room.ws.close();
  app.ws.close();
}
