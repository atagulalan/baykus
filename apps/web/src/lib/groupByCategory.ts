import type { SeriesSummary } from "../api/types.ts";

export function groupByCategory(items: SeriesSummary[]): Map<string, SeriesSummary[]> {
  const map = new Map<string, SeriesSummary[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return map;
}
