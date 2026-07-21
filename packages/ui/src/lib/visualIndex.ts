/** Where index `i` appears while dragging from `from` to `to`. */
export function visualIndex(i: number, from: number, to: number): number {
  if (from === to) return i;
  if (i === from) return to;
  if (from < to) {
    if (i > from && i <= to) return i - 1;
  } else if (i >= to && i < from) {
    return i + 1;
  }
  return i;
}
