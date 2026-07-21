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
