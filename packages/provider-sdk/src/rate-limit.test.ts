import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "./rate-limit.ts";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets burst-sized calls through immediately, then throttles to the refill rate", async () => {
    const limiter = createRateLimiter({ tokens: 2, perMs: 1000 });
    const order: number[] = [];

    const p1 = limiter.acquire().then(() => order.push(1));
    const p2 = limiter.acquire().then(() => order.push(2));
    const p3 = limiter.acquire().then(() => order.push(3));

    await vi.advanceTimersByTimeAsync(0);
    expect(order).toEqual([1, 2]);

    await vi.advanceTimersByTimeAsync(499);
    expect(order).toEqual([1, 2]);

    await vi.advanceTimersByTimeAsync(1);
    expect(order).toEqual([1, 2, 3]);

    await Promise.all([p1, p2, p3]);
  });

  it("never exceeds the configured hard limit within a window (tvmaze: 20/10s)", async () => {
    const limiter = createRateLimiter({ tokens: 20, perMs: 10_000 });
    let resolvedCount = 0;
    for (let i = 0; i < 25; i++) {
      limiter.acquire().then(() => resolvedCount++);
    }

    await vi.advanceTimersByTimeAsync(0);
    expect(resolvedCount).toBe(20);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(resolvedCount).toBe(25);
  });
});
