import type { WatchCategory } from "@baykus/api-client";
import type { LibrarySort } from "@baykus/ui";

const CATEGORY_DEFAULT_SORT: Record<WatchCategory, LibrarySort> = {
  needs_review: "added",
  watching: "lastWatched",
  not_watched_recently: "lastWatched",
  not_started: "added",
  watch_later: "added",
  up_to_date: "nextAir",
  finished: "lastWatched",
  stopped: "lastWatched",
};

export function sortsForCategory(category: WatchCategory): LibrarySort[] {
  switch (category) {
    case "needs_review":
      return [];
    case "not_started":
      return ["added", "title", "rating", "nextAir"];
    case "finished":
    case "stopped":
      return ["lastWatched", "added", "title", "rating"];
    default:
      return ["lastWatched", "added", "title", "rating", "nextAir"];
  }
}

export function sectionSort(
  sorts: Partial<Record<WatchCategory, LibrarySort>>,
  category: WatchCategory,
): LibrarySort {
  const preferred = sorts[category] ?? CATEGORY_DEFAULT_SORT[category];
  const allowed = sortsForCategory(category);
  if (allowed.length === 0) return CATEGORY_DEFAULT_SORT[category];
  return allowed.includes(preferred) ? preferred : CATEGORY_DEFAULT_SORT[category];
}
