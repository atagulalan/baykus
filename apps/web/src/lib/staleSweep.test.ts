import type { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

// E132: startManualSweep calls the real client import — mock it module-wide.
// The maybeStartSweep tests below always inject refreshAllSeriesFn, so the
// mock never interferes with them.
vi.mock("../api/client.ts", () => ({ refreshAllSeries: vi.fn() }));

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

describe("startManualSweep (E132 promise semantics)", () => {
  async function setup() {
    const mod = await freshModule();
    const { refreshAllSeries } = await import("../api/client.ts");
    // resetModules does not reset the vi.mock instance — clear it per test.
    vi.mocked(refreshAllSeries).mockReset();
    return {
      mod,
      refreshAllSeries: vi.mocked(refreshAllSeries),
      queryClient: { invalidateQueries: vi.fn() } as unknown as QueryClient,
      toast: { show: vi.fn() },
      messages: { done: (newEpisodes: number) => `done ${newEpisodes}`, error: "err" },
    };
  }

  it("resolves after the sweep settles — library invalidated, done toast shown", async () => {
    const { mod, refreshAllSeries, queryClient, toast, messages } = await setup();
    refreshAllSeries.mockResolvedValue({ ok: 2, failed: 0, newEpisodes: 3 });

    await mod.startManualSweep(queryClient, toast, messages);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["library"] });
    expect(toast.show).toHaveBeenCalledWith("done 3");
  });

  it("a concurrent call gets the same in-flight promise, no second request", async () => {
    const { mod, refreshAllSeries, queryClient, toast, messages } = await setup();
    let resolveRun: (() => void) | undefined;
    refreshAllSeries.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRun = () => resolve({ ok: 1, failed: 0, newEpisodes: 0 });
        }),
    );

    const first = mod.startManualSweep(queryClient, toast, messages);
    const second = mod.startManualSweep(queryClient, toast, messages);
    expect(refreshAllSeries).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

    resolveRun?.();
    await first;
    expect(toast.show).toHaveBeenCalledTimes(1);
  });

  it("resolves immediately while the quiet sweep holds the guard", async () => {
    const { mod, refreshAllSeries, queryClient, toast, messages } = await setup();
    mod.maybeStartSweep({
      onComplete: vi.fn(),
      refreshAllSeriesFn: () => new Promise(() => {}),
      nowMs: () => 1,
    });

    await mod.startManualSweep(queryClient, toast, messages);
    expect(refreshAllSeries).not.toHaveBeenCalled();
    expect(toast.show).not.toHaveBeenCalled();
  });

  it("resolves (not rejects) on failure, showing the error toast", async () => {
    const { mod, refreshAllSeries, queryClient, toast, messages } = await setup();
    refreshAllSeries.mockRejectedValue(new Error("boom"));

    await mod.startManualSweep(queryClient, toast, messages);
    expect(toast.show).toHaveBeenCalledWith("err", "error");
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});
