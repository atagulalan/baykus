import type { SeriesSummary, WatchCategory } from "@baykus/api-client";

export function groupByCategory(items: SeriesSummary[]): Map<WatchCategory, SeriesSummary[]> {
  const map = new Map<WatchCategory, SeriesSummary[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return map;
}
