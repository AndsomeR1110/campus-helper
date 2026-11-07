// @vitest-environment node
import { describe, expect, it } from "vitest";

import { ApiError } from "./api";
import {
  clientIp,
  createRateLimiter,
  enforceRateLimit,
  type RateLimiterOptions,
} from "./rate-limit";

/** Controllable clock so the tests never sleep. */
function fakeClock(start = 1_000_000) {
  let now = start;
  return {
    now: () => now,
    advance(ms: number) {
      now += ms;
    },
  };
}

function limiterWith(options: Partial<RateLimiterOptions> = {}) {
  const clock = fakeClock();
  const limiter = createRateLimiter({
    limit: 3,
    windowMs: 60_000,
    now: clock.now,
    ...options,
  });
  return { limiter, clock };
}

describe("createRateLimiter", () => {
  it("allows exactly `limit` hits and blocks the next one (PRD 11.3)", () => {
    const { limiter } = limiterWith({ limit: 3 });

    expect(limiter.hit("k")).toMatchObject({ limited: false, remaining: 2 });
    expect(limiter.hit("k")).toMatchObject({ limited: false, remaining: 1 });
    // the third attempt is still allowed, but it uses the budget up
    expect(limiter.hit("k")).toMatchObject({ limited: true, remaining: 0 });

    const fourth = limiter.hit("k");
    expect(fourth.limited).toBe(true);
    expect(fourth.remaining).toBe(0);
  });

  it("peek reports the state without recording a hit", () => {
    const { limiter } = limiterWith({ limit: 2 });

    limiter.hit("k");
    expect(limiter.peek("k")).toMatchObject({ limited: false, remaining: 1 });
    expect(limiter.peek("k")).toMatchObject({ limited: false, remaining: 1 });
    limiter.hit("k");
    expect(limiter.peek("k").limited).toBe(true);
  });

  it("returns an unlimited state for an unknown key", () => {
    const { limiter } = limiterWith({ limit: 5 });
    expect(limiter.peek("never-seen")).toEqual({
      limited: false,
      remaining: 5,
      retryAfterSeconds: 0,
    });
  });

  it("frees a slot once the oldest hit leaves the window", () => {
    const { limiter, clock } = limiterWith({ limit: 2, windowMs: 10_000 });

    limiter.hit("k");
    limiter.hit("k");
    expect(limiter.peek("k").limited).toBe(true);

    clock.advance(9_000);
    expect(limiter.peek("k").limited).toBe(true);

    clock.advance(1_001); // the first hit is now older than the window
    expect(limiter.peek("k").limited).toBe(false);
    expect(limiter.hit("k").limited).toBe(false);
  });

  it("reports Retry-After in whole seconds", () => {
    const { limiter, clock } = limiterWith({ limit: 2, windowMs: 30_000 });

    limiter.hit("k");
    clock.advance(5_000);
    limiter.hit("k");
    // oldest hit was at t=0, window 30s, now t=5s -> ~25s left
    expect(limiter.hit("k").retryAfterSeconds).toBe(25);
  });

  it("keeps separate keys in separate buckets", () => {
    const { limiter } = limiterWith({ limit: 2 });

    expect(limiter.hit("a")).toMatchObject({ limited: false, remaining: 1 });
    expect(limiter.hit("a")).toMatchObject({ limited: true, remaining: 0 });
    // "b" is untouched by "a" hitting its own limit
    expect(limiter.hit("b")).toMatchObject({ limited: false, remaining: 1 });
    expect(limiter.size).toBe(2);
  });

  it("reset clears a bucket after a successful sign-in", () => {
    const { limiter } = limiterWith({ limit: 1 });

    limiter.hit("k");
    expect(limiter.peek("k").limited).toBe(true);

    limiter.reset("k");
    expect(limiter.peek("k").limited).toBe(false);
    expect(limiter.size).toBe(0);
  });

  it("prune drops expired buckets so memory does not grow forever", () => {
    const { limiter, clock } = limiterWith({ limit: 2, windowMs: 1_000 });

    limiter.hit("a");
    limiter.hit("b");
    expect(limiter.size).toBe(2);

    clock.advance(1_500);
    limiter.prune();
    expect(limiter.size).toBe(0);
  });

  it("evicts the least recently used key beyond maxKeys", () => {
    const { limiter, clock } = limiterWith({ limit: 2, windowMs: 60_000, maxKeys: 2 });

    limiter.hit("old");
    clock.advance(10);
    limiter.hit("middle");
    clock.advance(10);
    limiter.hit("new");

    expect(limiter.size).toBe(2);
    expect(limiter.peek("old").limited).toBe(false);
    expect(limiter.peek("old").remaining).toBe(2); // evicted, so it looks untouched
    expect(limiter.peek("new").limited).toBe(false);
  });
});

describe("enforceRateLimit", () => {
  it("does nothing while under the limit", () => {
    const { limiter } = limiterWith({ limit: 2 });
    limiter.hit("k");
    expect(() => enforceRateLimit(limiter, "k")).not.toThrow();
  });

  it("throws TOO_MANY_ATTEMPTS with a Retry-After once the limit is reached", () => {
    const { limiter } = limiterWith({ limit: 1, windowMs: 60_000 });
    limiter.hit("k");

    let thrown: unknown;
    try {
      enforceRateLimit(limiter, "k");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    const apiError = thrown as ApiError;
    expect(apiError.code).toBe("TOO_MANY_ATTEMPTS");
    expect(apiError.status).toBe(429);
    expect(apiError.retryAfterSeconds).toBe(60);
  });

  it("does not consume quota itself", () => {
    const { limiter } = limiterWith({ limit: 2 });
    enforceRateLimit(limiter, "k");
    enforceRateLimit(limiter, "k");
    expect(limiter.peek("k").remaining).toBe(2);
  });
});

describe("clientIp", () => {
  const request = (headers: Record<string, string>) =>
    new Request("http://localhost/api/auth/login", { headers });

  it("uses the hop our own proxy appended, not one the client can spoof", () => {
    // The client sent "203.0.113.7"; the reverse proxy appended the real address.
    expect(clientIp(request({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" }))).toBe("70.41.3.18");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(request({ "x-real-ip": "198.51.100.9" }))).toBe("198.51.100.9");
  });

  it("returns a shared bucket name when no header is present", () => {
    expect(clientIp(request({}))).toBe("unknown");
  });
});
