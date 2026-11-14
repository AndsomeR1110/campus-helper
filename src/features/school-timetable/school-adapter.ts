// Runs only inside the private school WebView; no imports or exported secrets.
export function discoverTimetable() {
  if (location.origin !== "https://ebridge.xjtlu.edu.cn") return { status: "login" };
  if (document.title.includes("EVL_020")) return { status: "expired" };
  const memory = window as typeof window & { __campusTimetableNavigating?: boolean };
  if (memory.__campusTimetableNavigating) return { status: "navigating" };
  const frame = document.querySelector<HTMLIFrameElement>(
    'iframe[src*="timetableplus.xjtlu.edu.cn/pt/"]',
  );
  if (frame) {
    const u = new URL(frame.src);
    if (
      u.origin !== "https://timetableplus.xjtlu.edu.cn" ||
      u.pathname !== "/pt/" ||
      !/^#\/[0-9a-f]{64}(?:\?|$)/i.test(u.hash)
    )
      throw Error("INVALID_SCHOOL_PAGE");
    memory.__campusTimetableNavigating = true;
    return { status: "timetable", url: u.href };
  }
  const personal = [...document.querySelectorAll<HTMLAnchorElement>("a")].find((a) =>
    /My Personal Class Timetable/i.test(a.textContent || ""),
  );
  if (personal) {
    const match = /(\d{4}\/\d{2})\s*S([12])/i.exec(personal.textContent || "");
    if (!match) throw Error("UNSUPPORTED_TERM");
    const term = match[1] + " S" + match[2];
    if (term !== "2026/27 S1") throw Error("UNSUPPORTED_TERM");
    memory.__campusTimetableNavigating = true;
    setTimeout(() => personal.click(), 100);
    return { status: "navigating", term };
  }
  const menu = [...document.querySelectorAll<HTMLElement>("a,[role=menuitem]")].find(
    (a) => a.textContent?.trim() === "Timetables",
  );
  if (menu) {
    memory.__campusTimetableNavigating = true;
    menu.click();
    return { status: "navigating" };
  }
  const sso = [
    ...document.querySelectorAll<HTMLInputElement | HTMLButtonElement>(
      "button,input[type=button],input[type=submit]",
    ),
  ].find((a) => (a.textContent || a.value || "").trim() === "XJTLU Account");
  if (sso) {
    memory.__campusTimetableNavigating = true;
    sso.click();
    return { status: "login" };
  }
  return { status: "waiting" };
}
export async function fetchSchoolTimetable() {
  if (location.origin !== "https://timetableplus.xjtlu.edu.cn" || location.pathname !== "/pt/")
    throw Error("INVALID_SCHOOL_PAGE");
  const match = /^#\/([0-9a-f]{64})(?:\?|$)/i.exec(location.hash);
  if (!match) throw Error("INVALID_SCHOOL_PAGE");
  // Cover all supported course weeks; never return the enrollment hash to the app.
  const r = await fetch("/ptapi/api/enrollment/hash/" + match[1] + "/activity?start=1&end=20", {
    cache: "no-store",
    credentials: "same-origin",
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw Error(r.status === 401 || r.status === 403 ? "AUTH_REQUIRED" : "SCHOOL_UNAVAILABLE");
  const rows: unknown = await r.json();
  if (!Array.isArray(rows) || !rows.length || rows.length > 200) throw Error("INVALID_SCHOOL_DATA");
  const keys = [
    "identity",
    "moduleId",
    "name",
    "staff",
    "location",
    "scheduledDay",
    "startTime",
    "endTime",
    "weekPattern",
  ];
  return {
    activities: rows.map((row) => Object.fromEntries(keys.map((key) => [key, row[key] ?? null]))),
  };
}
