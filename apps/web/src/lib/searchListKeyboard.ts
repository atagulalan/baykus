/**
 * E154: next highlight index for search results (−1 = none).
 * No wrap past ends; ↑ from first returns to none.
 */
export function nextSearchActiveIndex(
  current: number,
  key: "ArrowDown" | "ArrowUp",
  length: number,
): number {
  if (length <= 0) return -1;
  if (key === "ArrowDown") {
    if (current < 0) return 0;
    return current < length - 1 ? current + 1 : current;
  }
  if (current <= 0) return -1;
  return current - 1;
}

/** E154: Enter / Shift+Enter target — highlighted row, else first. */
export function resolveSearchEnterIndex(activeIndex: number, length: number): number {
  if (length <= 0) return -1;
  return activeIndex >= 0 && activeIndex < length ? activeIndex : 0;
}
