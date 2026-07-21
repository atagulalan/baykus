import { refreshAllSeries } from "@baykus/api-client";

const STALE_REFRESH_HOURS = 24;
export const SWEEP_THROTTLE_MS = 15 * 60 * 1000;

export function isStale(
  lastRefreshedAt: string | null,
  now: string = new Date().toISOString(),
): boolean {
  if (lastRefreshedAt === null) return true;
  return (
    new Date(lastRefreshedAt).getTime() <
    new Date(now).getTime() - STALE_REFRESH_HOURS * 60 * 60 * 1000
  );
}

interface SweepState {
  running: boolean;
  lastAttemptAt: number | null;
}

const state: SweepState = {
  running: false,
  lastAttemptAt: null,
};

/** E64: at most one auto-sweep attempt per 15 minutes (mobile module singleton). */
export function maybeStartSweep(opts?: {
  onComplete?: () => void | Promise<void>;
  nowMs?: () => number;
}): void {
  const now = opts?.nowMs?.() ?? Date.now();
  if (state.running) return;
  if (state.lastAttemptAt != null && now - state.lastAttemptAt < SWEEP_THROTTLE_MS) return;

  state.running = true;
  state.lastAttemptAt = now;
  void (async () => {
    try {
      await refreshAllSeries(() => {});
      await opts?.onComplete?.();
    } catch {
      // Auto-sweep failures are silent — user can refresh manually.
    } finally {
      state.running = false;
    }
  })();
}
