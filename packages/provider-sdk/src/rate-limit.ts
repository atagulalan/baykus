/** Awaitable token-bucket limiter, e.g. for TVmaze's hard 20 req/10s cap. */
export interface RateLimiter {
  /** Resolves once a token is available, consuming it. */
  acquire(): Promise<void>;
}

export interface RateLimiterOptions {
  /** Bucket capacity — max burst size. */
  tokens: number;
  /** Time window in ms over which the bucket fully refills. */
  perMs: number;
}

export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const capacity = opts.tokens;
  const refillPerMs = opts.tokens / opts.perMs;
  let available = capacity;
  let lastRefillAt = Date.now();
  const waiters: Array<() => void> = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  function refill(): void {
    const now = Date.now();
    const elapsed = now - lastRefillAt;
    if (elapsed > 0) {
      available = Math.min(capacity, available + elapsed * refillPerMs);
      lastRefillAt = now;
    }
  }

  function pump(): void {
    timer = undefined;
    refill();
    while (available >= 1 && waiters.length > 0) {
      available -= 1;
      waiters.shift()?.();
    }
    if (waiters.length > 0) {
      const needed = 1 - available;
      const waitMs = Math.max(1, Math.ceil(needed / refillPerMs));
      timer = setTimeout(pump, waitMs);
    }
  }

  return {
    acquire(): Promise<void> {
      return new Promise((resolve) => {
        waiters.push(resolve);
        if (!timer) pump();
      });
    },
  };
}
