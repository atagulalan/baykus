import { useSyncExternalStore } from "react";
import type { CSSProperties } from "react";

/**
 * E51: at most one library poster may own `poster-${id}` at a time.
 * Forward nav arms it on click; reverse nav needs the same id on the
 * destination card's first paint inside the view-transition update.
 */
let lastPosterItemId: number | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setLastPosterItemId(id: number): void {
  if (lastPosterItemId === id) return;
  lastPosterItemId = id;
  emit();
}

export function clearLastPosterItemId(): void {
  if (lastPosterItemId === null) return;
  lastPosterItemId = null;
  emit();
}

export function getLastPosterItemId(): number | null {
  return lastPosterItemId;
}

export function subscribeLastPosterItemId(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function useLastPosterItemId(): number | null {
  return useSyncExternalStore(subscribeLastPosterItemId, getLastPosterItemId, () => null);
}

export function posterMorphStyle(itemId: number, active: boolean): CSSProperties | undefined {
  if (!active) return undefined;
  return {
    viewTransitionName: `poster-${itemId}`,
    viewTransitionClass: "poster-morph",
  };
}

function isPosterMorphBrowse(pathname: string): boolean {
  return pathname === "/" || pathname === "/watch";
}

function isPosterMorphSeries(pathname: string): boolean {
  return pathname.startsWith("/series/") && pathname !== "/series/new";
}

/**
 * Keep the armed poster name only for browse↔series (and search/calendar→series)
 * morphs. Any other hop must clear it or that card/detail poster gets its own
 * VT group and looks different from the rest of the page fade.
 */
export function shouldRetainPosterMorph(from: string | undefined, to: string): boolean {
  if (!from) return false;
  const fromBrowse = isPosterMorphBrowse(from);
  const toBrowse = isPosterMorphBrowse(to);
  const fromSeries = isPosterMorphSeries(from);
  const toSeries = isPosterMorphSeries(to);
  if (fromBrowse && toSeries) return true;
  if (fromSeries && toBrowse) return true;
  if (toSeries && (from === "/search" || from.startsWith("/calendar") || from === "/watch/history")) {
    return true;
  }
  if (fromSeries && toSeries) return true;
  return false;
}

type PosterMorphRouter = {
  subscribe: (
    event: "onBeforeLoad",
    fn: (event: { fromLocation?: { pathname: string }; toLocation: { pathname: string } }) => void,
  ) => () => void;
};

/** Drop a stale armed poster before the VT old snapshot on non-morph navigations. */
export function installPosterMorphCleanup(router: PosterMorphRouter): () => void {
  return router.subscribe("onBeforeLoad", (event) => {
    const from = event.fromLocation?.pathname;
    const to = event.toLocation.pathname;
    if (!shouldRetainPosterMorph(from, to)) {
      clearLastPosterItemId();
    }
  });
}
