import { ApiError } from "@/lib/api";

/**
 * 内存滑动窗口限流（PRD 11.3）。
 *
 * 部署只有一台服务器，所以不需要 Redis：每个 key 在进程内保存最近的尝试时间戳，
 * 超过 `windowMs` 的自动丢弃。进程重启会清空计数，这是可接受的（重启本身也会打断爆破）。
 *
 * 用法：
 *   const loginLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });
 *   enforceRateLimit(loginLimiter, `login:${clientIp(request)}:${email}`); // 超限直接抛 429
 *   // …校验失败时
 *   loginLimiter.hit(key);
 *   // …登录成功时
 *   loginLimiter.reset(key);
 *
 * 给其他模块（发帖、认领）：`createRateLimiter` 是纯函数式的，各自建一个实例即可，
 * 不要共用同一个 key 空间，否则两个接口会互相计数。
 */

export interface RateLimiterOptions {
  /** 窗口内允许的最大次数；第 limit + 1 次被拒。 */
  limit: number;
  /** 窗口长度（毫秒）。 */
  windowMs: number;
  /** 最多跟踪多少个 key，超出后淘汰最久未活动的（防止内存被随机 key 撑爆）。 */
  maxKeys?: number;
  /** 注入时钟，便于测试。 */
  now?: () => number;
}

export interface RateLimitState {
  /**
   * 配额是否已经用完（true 表示下一次尝试会被拒绝）。
   * `hit()` 是记录**之后**返回状态，所以「刚好用掉最后一次」时这里就是 true。
   */
  limited: boolean;
  /** 本窗口内剩余可用次数。 */
  remaining: number;
  /** 建议的 Retry-After（秒）；未超限时为 0。 */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  /** 记录一次尝试/失败，返回记录后的状态。 */
  hit(key: string): RateLimitState;
  /** 只查询不记录（在干活之前调用）。 */
  peek(key: string): RateLimitState;
  /** 清空某个 key（成功之后调用）。 */
  reset(key: string): void;
  /** 丢弃所有过期条目。 */
  prune(): void;
  /** 当前跟踪的 key 数量（用于测试和监控）。 */
  readonly size: number;
}

interface Bucket {
  /** 最近的尝试时间戳（升序）。 */
  hits: number[];
  /** 最近一次活动时间，用于 maxKeys 淘汰。 */
  touchedAt: number;
}

const DEFAULT_MAX_KEYS = 10_000;

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { limit, windowMs } = options;
  const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
  const clock = options.now ?? (() => Date.now());
  const buckets = new Map<string, Bucket>();

  function pruneBucket(bucket: Bucket, now: number): void {
    const cutoff = now - windowMs;
    // 时间戳升序，找到第一个仍有效的下标即可
    let firstValid = 0;
    while (firstValid < bucket.hits.length && bucket.hits[firstValid] <= cutoff) firstValid++;
    if (firstValid > 0) bucket.hits = bucket.hits.slice(firstValid);
  }

  function evictIfNeeded(): void {
    if (buckets.size <= maxKeys) return;
    const entries = [...buckets.entries()].sort((a, b) => a[1].touchedAt - b[1].touchedAt);
    for (const [key] of entries.slice(0, buckets.size - maxKeys)) buckets.delete(key);
  }

  function stateOf(bucket: Bucket | undefined, now: number): RateLimitState {
    const used = bucket?.hits.length ?? 0;
    const remaining = Math.max(0, limit - used);
    if (remaining > 0) return { limited: false, remaining, retryAfterSeconds: 0 };

    // 最早那次尝试过期后就能再试一次
    const oldest = bucket?.hits[0] ?? now;
    const waitMs = Math.max(0, oldest + windowMs - now);
    return {
      limited: true,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)),
    };
  }

  return {
    hit(key: string): RateLimitState {
      const now = clock();
      const bucket = buckets.get(key) ?? { hits: [], touchedAt: now };
      pruneBucket(bucket, now);
      bucket.hits.push(now);
      bucket.touchedAt = now;
      buckets.set(key, bucket);
      evictIfNeeded();
      return stateOf(bucket, now);
    },

    peek(key: string): RateLimitState {
      const now = clock();
      const bucket = buckets.get(key);
      if (!bucket) return { limited: false, remaining: limit, retryAfterSeconds: 0 };
      pruneBucket(bucket, now);
      return stateOf(bucket, now);
    },

    reset(key: string): void {
      buckets.delete(key);
    },

    prune(): void {
      const now = clock();
      for (const [key, bucket] of buckets) {
        pruneBucket(bucket, now);
        if (bucket.hits.length === 0) buckets.delete(key);
      }
    },

    get size(): number {
      return buckets.size;
    },
  };
}

/**
 * 达到上限时抛 429 `TOO_MANY_ATTEMPTS`，否则什么也不做（不记录）。
 * 调用方先在"干活之前"检查，失败后再 `hit()`，这样成功不会消耗配额。
 */
export function enforceRateLimit(limiter: RateLimiter, key: string): void {
  const state = limiter.peek(key);
  if (!state.limited) return;
  throw new ApiError(
    "TOO_MANY_ATTEMPTS",
    `Too many attempts. Please try again in ${state.retryAfterSeconds} seconds.`,
    undefined,
    state.retryAfterSeconds,
  );
}

/**
 * 客户端 IP：取 x-forwarded-for 的**最后一跳**，其次 x-real-ip。
 * 最后一跳是我们自己的反向代理（Caddy）写进去的真实来源地址；前面的条目客户端可以随便伪造，
 * 取第一跳的话，每次请求换一个假 IP 就能绕过限流。
 * 本地开发（`npm run dev`，没有反向代理）没有这个头，落到 "unknown"。
 * 取不到时统一返回 "unknown" —— 这样限流仍然生效（所有匿名请求共用一个桶）。
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded.split(",").at(-1)?.trim();
    if (last) return last;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}
