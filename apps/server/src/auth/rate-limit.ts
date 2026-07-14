import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";

export interface RateLimiter {
  /** Returns true if the call is allowed, false if the key is out of tokens. */
  consume(key: string): boolean;
}

/** Continuous-refill token bucket, one bucket per key, in-memory. */
export function createRateLimiter(maxPerMinute: number): RateLimiter {
  const buckets = new Map<string, { tokens: number; lastRefill: number }>();

  return {
    consume(key) {
      const now = Date.now();
      const bucket = buckets.get(key) ?? { tokens: maxPerMinute, lastRefill: now };
      const elapsedMinutes = (now - bucket.lastRefill) / 60_000;
      bucket.tokens = Math.min(maxPerMinute, bucket.tokens + elapsedMinutes * maxPerMinute);
      bucket.lastRefill = now;

      if (bucket.tokens < 1) {
        buckets.set(key, bucket);
        return false;
      }
      bucket.tokens -= 1;
      buckets.set(key, bucket);
      return true;
    },
  };
}

/**
 * X-Forwarded-For first (multi mode is expected to run behind a reverse
 * proxy that sets it), falling back to the raw socket address for direct
 * connections; "unknown" (a single shared bucket) only when neither is
 * available, e.g. Hono's in-process app.request() test harness.
 */
export function clientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}
