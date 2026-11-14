/** Runs ONLY in the school WebView. No imports: bundled as a native asset. */
export async function shuttleSchoolRequest(operation: string, input: Record<string, unknown>) {
  const memory = window as Window & { __campusShuttleVerification?: Record<string, string> };
  const origin = "https://shuttlebus.xjtlu.edu.cn";
  const fail = (code: string): never => {
    throw new Error(code);
  };
  const pathFor = (raw: string | null, pattern: RegExp) => {
    const url = new URL(raw ?? "", origin);
    if (url.origin !== origin || url.search || url.hash || !pattern.test(url.pathname))
      fail("UNEXPECTED_RESPONSE");
    return url.pathname;
  };
  const read = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(origin + path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (new URL(response.url).origin !== origin || /Login|Sign in/i.test(doc.title))
      fail("AUTH_REQUIRED");
    if (!response.ok)
      fail(
        response.status === 401 || response.status === 403 ? "AUTH_REQUIRED" : "SCHOOL_UNAVAILABLE",
      );
    if (!doc.title.startsWith("Shuttle Bus -")) fail("AUTH_REQUIRED");
    return {
      doc,
      path: new URL(response.url).pathname,
      serverDateMs: Date.parse(response.headers.get("Date") ?? ""),
    };
  };
  const digits = (value: unknown) =>
    typeof value === "string" && /^\d{1,12}$/.test(value) ? value : fail("INVALID_INPUT");
  const date = () =>
    typeof input.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.date) &&
    !Number.isNaN(Date.parse(input.date))
      ? input.date
      : fail("INVALID_INPUT");
  const route = () =>
    input.route === 1 || input.route === 2 ? input.route : fail("INVALID_INPUT");
  const labels = (card: Element) =>
    [...card.querySelectorAll("label")]
      .map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
  const details = (card: Element) => {
    const all = labels(card),
      times = all.filter((t) => /^\d{2}:\d{2}$/.test(t)),
      stops = all.filter((t) => /^(TC|SIP) Campus$/.test(t));
    if (times.length !== 2 || stops.length !== 2) fail("UNEXPECTED_RESPONSE");
    return {
      departure: times[0],
      arrival: times[1],
      from: stops[0],
      to: stops[1],
      pickup: all.find((_, i) => /Pick-up\s*Point/i.test(all[i - 1] ?? "")) ?? "",
    };
  };
  const scheduleCards = (doc: Document, selectedDate: string, selectedRoute: number) =>
    [...doc.forms]
      .filter((f) => /\/schedule\/book\//.test(f.getAttribute("action") ?? ""))
      .map((form) => {
        const path = pathFor(form.getAttribute("action"), /^\/schedule\/book\/\d+$/);
        const card = form.closest(".card");
        if (
          !card ||
          form.method.toLowerCase() !== "post" ||
          (form.querySelector('[name="departure_date"]') as HTMLInputElement | null)?.value !==
            selectedDate
        )
          fail("UNEXPECTED_RESPONSE");
        return {
          id: path.split("/").pop()!,
          date: selectedDate,
          route: selectedRoute,
          ...details(card!),
          form,
        };
      });
  const tripCards = (doc: Document) => {
    if (doc.title.trim() !== "Shuttle Bus - Booking List") fail("UNEXPECTED_RESPONSE");
    const result = [...doc.querySelectorAll<HTMLAnchorElement>('a[href*="/travels/cancel/"]')].map(
      (link) => {
        const path = pathFor(link.getAttribute("href"), /^\/travels\/cancel\/\d+$/);
        const card = link.closest(".card");
        if (!card) fail("UNEXPECTED_RESPONSE");
        const selectedDate = labels(card!).find((t) => /^\d{4}-\d{2}-\d{2}$/.test(t));
        if (!selectedDate) fail("UNEXPECTED_RESPONSE");
        return {
          id: path.split("/").pop()!,
          date: selectedDate!,
          ...details(card!),
          qrAvailable: false,
        };
      },
    );
    // After departure the school retains a Booked history card with no action or ID.
    const history = [...doc.querySelectorAll(".card")].filter((card) => {
      if (card.querySelector('a[href*="/travels/cancel/"]')) return false;
      const values = labels(card);
      if (!values.some((t) => /^\d{4}-\d{2}-\d{2}$/.test(t)) || !values.includes("Booked"))
        return false;
      details(card);
      return true;
    });
    if (!result.length && !history.length && !doc.body.textContent?.includes("您还没有预约区间车"))
      fail("UNEXPECTED_RESPONSE");
    return result;
  };
  if (!["session", "schedules", "trips", "book", "cancel", "pass", "scan"].includes(operation))
    fail("INVALID_INPUT");
  if (["book", "cancel"].includes(operation) && input.confirmed !== true)
    fail("CONFIRMATION_REQUIRED");
  if (operation === "scan") {
    const id = digits(input.id),
      ticket = memory.__campusShuttleVerification?.[id];
    if (!ticket) fail("PASS_UNAVAILABLE");
    const response = await fetch(
      `${origin}/booking/code/verification/${encodeURIComponent(ticket!)}`,
      { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    if (!response.ok) fail("SCHOOL_UNAVAILABLE");
    return { status: (await response.text()).trim() ? "changed" : "pending" };
  }
  if (operation === "session") {
    const { doc } = await read("/");
    return {
      authenticated:
        !doc.querySelector('a[href$="/sso"]') && doc.body.textContent!.includes("Today's Travel"),
    };
  }
  if (operation === "schedules") {
    const selectedDate = date(),
      selectedRoute = route();
    const { doc } = await read(
      `/schedule/list?route_id=${selectedRoute}&departure_date=${selectedDate}`,
    );
    return {
      schedules: scheduleCards(doc, selectedDate, selectedRoute).map((value) => ({
        id: value.id,
        date: value.date,
        route: value.route,
        departure: value.departure,
        arrival: value.arrival,
        from: value.from,
        to: value.to,
        pickup: value.pickup,
      })),
    };
  }
  if (operation === "trips") {
    const { doc } = await read("/booking/list"),
      home = await read("/");
    const available = new Set(
      [...home.doc.querySelectorAll<HTMLAnchorElement>('a[href*="/booking/code/"]')].map((a) =>
        pathFor(a.getAttribute("href"), /^\/booking\/code\/\d+$/)
          .split("/")
          .pop(),
      ),
    );
    const trips = tripCards(doc).map((t) => ({ ...t, qrAvailable: available.has(t.id) }));
    return { trips };
  }
  if (operation === "book") {
    const selectedDate = date(),
      selectedRoute = route(),
      id = digits(input.id);
    const { doc } = await read(
      `/schedule/list?route_id=${selectedRoute}&departure_date=${selectedDate}`,
    );
    const selected = scheduleCards(doc, selectedDate, selectedRoute).find((s) => s.id === id);
    if (!selected) fail("UNAVAILABLE");
    const match = (t: ReturnType<typeof tripCards>[number]) =>
      t.date === selectedDate && t.departure === selected!.departure && t.from === selected!.from;
    const before = await read("/booking/list");
    if (tripCards(before.doc).some(match)) fail("ALREADY_BOOKED");
    try {
      const result = await read(`/schedule/book/${id}`, {
        method: "POST",
        body: new FormData(selected!.form),
      });
      if (!result.doc.body.textContent?.includes("Booking Succeed")) fail("BOOKING_REJECTED");
      const after = await read("/booking/list"),
        matches = tripCards(after.doc).filter(match);
      if (matches.length !== 1) fail("RESULT_UNKNOWN");
      return { confirmed: true, trip: matches[0] };
    } catch {
      return fail("RESULT_UNKNOWN");
    }
  }
  const id = digits(input.id);
  const list = await read("/booking/list");
  const own = tripCards(list.doc).find((t) => t.id === id);
  if (!own) fail("NOT_FOUND");
  if (operation === "cancel") {
    const confirmation = await read(`/travels/cancel/${id}`);
    if (!confirmation.doc.body.textContent?.includes(own!.date)) fail("UNEXPECTED_RESPONSE");
    const link = [...confirmation.doc.querySelectorAll<HTMLAnchorElement>("a[href]")].find((a) =>
      a.getAttribute("href")?.includes(`/booking/cancel/${id}`),
    );
    if (!link) fail("UNAVAILABLE");
    const path = pathFor(link!.getAttribute("href"), new RegExp(`^/booking/cancel/${id}$`));
    try {
      const result = await read(path);
      if (!result.doc.body.textContent?.includes("Cancel Succeed")) fail("RESULT_UNKNOWN");
      const after = await read("/booking/list");
      if (tripCards(after.doc).some((t) => t.id === id)) fail("RESULT_UNKNOWN");
      if (memory.__campusShuttleVerification) delete memory.__campusShuttleVerification[id];
      return { cancelled: true };
    } catch {
      return fail("RESULT_UNKNOWN");
    }
  }
  // Ticket bytes stay on this device; no cookies or CSRF values cross the bridge.
  const home = await read("/");
  if (!home.doc.querySelector(`a[href$="/booking/code/${id}"]`)) fail("PASS_UNAVAILABLE");
  const started = performance.now(),
    code = await read(`/booking/code/${id}`);
  const script = [...code.doc.scripts]
    .filter((s) => !s.src)
    .map((s) => s.textContent)
    .join("\n");
  const literal = script.match(/qrcode\.makeCode\(\s*("(?:[^"\\]|\\.)*")\s*\)/)?.[1];
  if (!literal) fail("UNEXPECTED_RESPONSE");
  const payload: unknown = JSON.parse(literal!);
  if (typeof payload !== "string" || payload.length > 2048 || !/@\d+$/.test(payload))
    fail("UNEXPECTED_RESPONSE");
  memory.__campusShuttleVerification ??= {};
  memory.__campusShuttleVerification[id] = (payload as string).slice(
    0,
    (payload as string).lastIndexOf("@"),
  );
  const stamp = Number((payload as string).slice((payload as string).lastIndexOf("@") + 1)) * 1000;
  const serverAge = Number.isFinite(code.serverDateMs) ? Math.max(0, code.serverDateMs - stamp) : 0;
  const validForMs = Math.max(0, 9000 - serverAge - (performance.now() - started));
  return { payload, validForMs };
}
