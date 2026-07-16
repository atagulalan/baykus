import { describe, expect, it, vi } from "vitest";

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function freshModule() {
  vi.resetModules();
  return import("./staleSweep.ts");
}

describe("isStale (E63 mirror)", () => {
  it("null lastRefreshedAt is always stale", async () => {
    const { isStale } = await freshModule();
    expect(isStale(null, "2026-01-10T00:00:00Z")).toBe(true);
  });

  it("23 hours ago is fresh", async () => {
    const { isStale } = await freshModule();
    expect(isStale("2026-01-09T01:00:00Z", "2026-01-10T00:00:00Z")).toBe(false);
  });

  it("25 hours ago is stale", async () => {
    const { isStale } = await freshModule();
    expect(isStale("2026-01-08T23:00:00Z", "2026-01-10T00:00:00Z")).toBe(true);
  });
});

describe("maybeStartSweep (E64)", () => {
  it("runs once, then throttles further attempts for 15 minutes", async () => {
    const { maybeStartSweep } = await freshModule();
    const refreshAllSeriesFn = vi.fn(async (onProgress: (e: never) => void) => {
      onProgress({ done: 1, total: 1, itemId: 1, ok: true, newEpisodes: 0 } as never);
      return { ok: 1, failed: 0, newEpisodes: 0 };
    });
    const onComplete = vi.fn();
    let now = 1_000_000;

    maybeStartSweep({ onComplete, refreshAllSeriesFn, nowMs: () => now });
    await flushPromises();
    expect(refreshAllSeriesFn).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Well within the 15-minute throttle window — no second attempt.
    now += 5 * 60 * 1000;
    maybeStartSweep({ onComplete, refreshAllSeriesFn, nowMs: () => now });
    await flushPromises();
    expect(refreshAllSeriesFn).toHaveBeenCalledTimes(1);

    // Past the throttle window — fires again.
    now += 11 * 60 * 1000;
    maybeStartSweep({ onComplete, refreshAllSeriesFn, nowMs: () => now });
    await flushPromises();
    expect(refreshAllSeriesFn).toHaveBeenCalledTimes(2);
  });

  it("never runs two sweeps concurrently", async () => {
    const { maybeStartSweep } = await freshModule();
    let resolveFirst: (() => void) | undefined;
    const refreshAllSeriesFn = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFirst = () => resolve({ ok: 1, failed: 0, newEpisodes: 0 });
        }),
    );
    const onComplete = vi.fn();

    maybeStartSweep({ onComplete, refreshAllSeriesFn, nowMs: () => 1000 });
    maybeStartSweep({ onComplete, refreshAllSeriesFn, nowMs: () => 1000 }); // no-op — already running
    expect(refreshAllSeriesFn).toHaveBeenCalledTimes(1);

    resolveFirst?.();
    await flushPromises();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("is skipped entirely while the manual refresh-all is marked running", async () => {
    const { maybeStartSweep, setManualRefreshRunning } = await freshModule();
    const refreshAllSeriesFn = vi.fn(async () => ({ ok: 1, failed: 0, newEpisodes: 0 }));
    const onComplete = vi.fn();

    setManualRefreshRunning(true);
    maybeStartSweep({ onComplete, refreshAllSeriesFn, nowMs: () => 1000 });
    await flushPromises();
    expect(refreshAllSeriesFn).not.toHaveBeenCalled();

    setManualRefreshRunning(false);
    maybeStartSweep({ onComplete, refreshAllSeriesFn, nowMs: () => 1000 });
    await flushPromises();
    expect(refreshAllSeriesFn).toHaveBeenCalledTimes(1);
  });

  it("failures are silent — onComplete is not called, but the running flag still clears", async () => {
    const { maybeStartSweep, SWEEP_THROTTLE_MS } = await freshModule();
    const refreshAllSeriesFn = vi.fn(async () => {
      throw new Error("network blip");
    });
    const onComplete = vi.fn();
    let now = 1;

    maybeStartSweep({ onComplete, refreshAllSeriesFn, nowMs: () => now });
    await flushPromises();
    expect(onComplete).not.toHaveBeenCalled();

    // Not throttled by failure — a later attempt can still run (past the window).
    now += SWEEP_THROTTLE_MS + 1;
    maybeStartSweep({ onComplete, refreshAllSeriesFn, nowMs: () => now });
    await flushPromises();
    expect(refreshAllSeriesFn).toHaveBeenCalledTimes(2);
  });
});
