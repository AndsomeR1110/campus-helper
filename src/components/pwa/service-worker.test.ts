// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Loads public/sw.js into a sandbox with fake `self` / `caches` / `fetch`,
 * then drives its fetch handler. Checks the caching rules from
 * docs/frontend-architecture.md §8 (FR-PWA-02, FR-PWA-04).
 */
const ORIGIN = "https://campus-helper.test";
const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

type Listener = (event: unknown) => void;

function loadServiceWorker({ network }: { network: "up" | "down" }) {
  const listeners: Record<string, Listener> = {};
  const store = new Map<string, Response>();
  const cache = {
    match: vi.fn(async (request: Request | string) =>
      store.get(typeof request === "string" ? request : new URL(request.url).pathname)?.clone(),
    ),
    put: vi.fn(async (request: Request, response: Response) => {
      store.set(new URL(request.url).pathname, response);
    }),
    addAll: vi.fn(async (urls: string[]) => {
      for (const url of urls) store.set(url, new Response(`cached ${url}`));
    }),
  };
  const fetchMock = vi.fn(async (request: Request) => {
    if (network === "down") throw new TypeError("Failed to fetch");
    return new Response(`network ${new URL(request.url).pathname}`);
  });

  runInNewContext(source, {
    self: {
      location: new URL(ORIGIN),
      addEventListener: (type: string, listener: Listener) => (listeners[type] = listener),
      skipWaiting: vi.fn(),
      clients: { claim: vi.fn() },
    },
    caches: { open: vi.fn(async () => cache), keys: vi.fn(async () => []), delete: vi.fn() },
    fetch: fetchMock,
    URL,
    Response,
    Promise,
  });

  async function dispatch(path: string, init: { mode?: RequestMode; method?: string } = {}) {
    const request = new Request(new URL(path, ORIGIN), { method: init.method ?? "GET" });
    // Request.mode is read-only and jsdom/undici never set "navigate"; fake it.
    Object.defineProperty(request, "mode", { value: init.mode ?? "cors" });
    let responded: Promise<Response> | undefined;
    listeners.fetch({ request, respondWith: (p: Promise<Response>) => (responded = p) });
    return responded ? await (await responded).text() : undefined;
  }

  async function install() {
    let done: Promise<unknown> | undefined;
    listeners.install({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
  }

  return { dispatch, install, cache, fetchMock };
}

describe("service worker", () => {
  let sw: ReturnType<typeof loadServiceWorker>;

  describe("online", () => {
    beforeEach(async () => {
      sw = loadServiceWorker({ network: "up" });
      await sw.install();
    });

    it("precaches the offline page on install", () => {
      expect(sw.cache.addAll).toHaveBeenCalledWith(["/offline.html"]);
    });

    it("never intercepts API requests (FR-PWA-04)", async () => {
      expect(await sw.dispatch("/api/space-bookings")).toBeUndefined();
      expect(sw.cache.put).not.toHaveBeenCalled();
    });

    it("never intercepts non-GET requests", async () => {
      expect(await sw.dispatch("/lost-found/new", { method: "POST" })).toBeUndefined();
    });

    it("loads pages from the network and does not cache them (FR-PWA-04)", async () => {
      expect(await sw.dispatch("/bookings", { mode: "navigate" })).toBe("network /bookings");
      expect(sw.cache.put).not.toHaveBeenCalled();
    });

    it("caches hashed static assets after the first request", async () => {
      expect(await sw.dispatch("/_next/static/chunks/app.js")).toBe(
        "network /_next/static/chunks/app.js",
      );
      expect(sw.cache.put).toHaveBeenCalledTimes(1);
      expect(await sw.dispatch("/_next/static/chunks/app.js")).toBe(
        "network /_next/static/chunks/app.js",
      );
      expect(sw.fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("offline", () => {
    beforeEach(async () => {
      sw = loadServiceWorker({ network: "down" });
      await sw.install();
    });

    it("shows the offline page instead of a blank screen (PWA-AC-03)", async () => {
      expect(await sw.dispatch("/home", { mode: "navigate" })).toBe("cached /offline.html");
    });

    it("leaves API requests to fail, so the UI never shows a fake success (PWA-AC-04)", async () => {
      expect(await sw.dispatch("/api/space-bookings", { method: "POST" })).toBeUndefined();
    });
  });
});
