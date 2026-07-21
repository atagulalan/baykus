import type { WatchCategory } from "./categoryColors.ts";

/** Move one section from `from` to `to` index; no-op when out of bounds or unchanged. */
export function reorderSections(
  sections: readonly WatchCategory[],
  from: number,
  to: number,
): WatchCategory[] {
  if (from === to || from < 0 || to < 0 || from >= sections.length || to >= sections.length) {
    return [...sections];
  }
  const next = [...sections];
  const item = next[from];
  if (!item) return [...sections];
  next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function isRemovable(category: WatchCategory): boolean {
  return category !== "watching" && category !== "needs_review";
}

/**
 * Reorder within the combined [active, ...available] list, returning the new active list.
 * Crossing the boundary changes membership (web AddSectionBar parity).
 */
export function reorderCombined(
  combined: readonly WatchCategory[],
  activeCount: number,
  from: number,
  to: number,
): WatchCategory[] {
  const moved = combined[from];
  if (!moved) return combined.slice(0, activeCount);
  let target = to;
  if (from < activeCount && !isRemovable(moved)) target = Math.min(target, activeCount - 1);
  const next = reorderSections(combined, from, target);
  let newActive = activeCount;
  if (from < activeCount && target >= activeCount) newActive = activeCount - 1;
  else if (from >= activeCount && target < activeCount) newActive = activeCount + 1;
  return next.slice(0, newActive);
}
