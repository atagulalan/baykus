import { useSyncExternalStore } from "react";
import { refreshAllSeries } from "../api/client.ts";
import type { RefreshProgressEvent } from "../api/types.ts";

/** E63 mirror of packages/core's STALE_REFRESH_HOURS — web imports nothing from packages. */
const STALE_REFRESH_HOURS = 24;

/** E63 mirror of packages/core's isStale (3 lines, duplicated on purpose). */
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

/** E64: at most one sweep attempt per 15 minutes, per tab. */
export const SWEEP_THROTTLE_MS = 15 * 60 * 1000;

interface SweepState {
  running: boolean;
  lastAttemptAt: number | null;
  manualRefreshRunning: boolean;
  progress: { done: number; total: number } | null;
  manualProgress: { done: number; total: number } | null;
}

/** Module-scoped singleton — survives navigation, never runs concurrently with itself or the manual button. */
const state: SweepState = {
  running: false,
  lastAttemptAt: null,
  manualRefreshRunning: false,
  progress: null,
  manualProgress: null,
};

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getProgressSnapshot(): SweepState["progress"] {
  return state.progress;
}

/** LibraryPage's slim status line — re-renders only while a sweep is in flight. */
export function useSweepProgress(): { done: number; total: number } | null {
  return useSyncExternalStore(subscribe, getProgressSnapshot);
}

export function useManualRefreshRunning(): boolean {
  return useSyncExternalStore(subscribe, () => state.manualRefreshRunning);
}

export function useManualRefreshProgress(): { done: number; total: number } | null {
  return useSyncExternalStore(subscribe, () => state.manualProgress);
}

/** The manual "Tümünü yenile" mutation calls this so the sweep never overlaps it (E64). */
export function setManualRefreshRunning(running: boolean): void {
  state.manualRefreshRunning = running;
  if (!running) state.manualProgress = null;
  notify();
}

import type { QueryClient } from "@tanstack/react-query";

export function startManualSweep(
  queryClient: QueryClient,
  toast: { show: (msg: string, type?: "error" | "success") => void },
  t: (key: string, opts?: any) => string,
): void {
  if (state.running || state.manualRefreshRunning) return;

  state.manualRefreshRunning = true;
  state.manualProgress = null;
  notify();

  refreshAllSeries((event) => {
    state.manualProgress = { done: event.done, total: event.total };
    notify();
  })
    .then((result) => {
      queryClient.invalidateQueries({ queryKey: ["library"] });
      toast.show(t("library.refreshAllDone", { newEpisodes: result.newEpisodes }));
    })
    .catch(() => {
      toast.show(t("errors.generic"), "error");
    })
    .finally(() => {
      state.manualRefreshRunning = false;
      state.manualProgress = null;
      notify();
    });
}

export interface MaybeStartSweepDeps {
  onComplete: () => void;
  /** Injectable for tests. */
  refreshAllSeriesFn?: (
    onProgress: (event: RefreshProgressEvent) => void,
    staleOnly?: boolean,
  ) => Promise<unknown>;
  nowMs?: () => number;
}

/**
 * Fires the staleOnly refresh sweep if due: not already running, no manual
 * refresh-all in flight, and the 15-minute per-tab throttle has elapsed.
 * Failures are silent (E64) — the manual button is the primary path.
 */
export function maybeStartSweep(deps: MaybeStartSweepDeps): void {
  const now = (deps.nowMs ?? Date.now)();
  if (state.running || state.manualRefreshRunning) return;
  if (state.lastAttemptAt !== null && now - state.lastAttemptAt < SWEEP_THROTTLE_MS) return;

  state.lastAttemptAt = now;
  state.running = true;
  state.progress = null;
  notify();

  const run = deps.refreshAllSeriesFn ?? refreshAllSeries;
  run((event) => {
    state.progress = { done: event.done, total: event.total };
    notify();
  }, true)
    .then(() => {
      deps.onComplete();
    })
    .catch(() => {
      // silent — the sweep never surfaces errors (E64); the manual button keeps its toast.
    })
    .finally(() => {
      state.running = false;
      state.progress = null;
      notify();
    });
}
