import type { SeriesSummary } from "@baykus/api-client";
import type { LibrarySort } from "@baykus/ui";

/** Client-side sort for library / all-series section rows (web `sortSeriesSummaries`). */
export function sortSeriesSummaries(items: SeriesSummary[], sort: LibrarySort): SeriesSummary[] {
  const copy = [...items];
  copy.sort((a, b) => {
    switch (sort) {
      case "title":
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      case "lastWatched": {
        const aAt = a.lastWatchedAt ?? "";
        const bAt = b.lastWatchedAt ?? "";
        if (aAt === bAt) return a.title.localeCompare(b.title);
        if (!aAt) return 1;
        if (!bAt) return -1;
        return aAt < bAt ? 1 : -1;
      }
      case "rating": {
        const aR = a.rating ?? 0;
        const bR = b.rating ?? 0;
        if (aR !== bR) return bR - aR;
        return a.title.localeCompare(b.title);
      }
      case "nextAir": {
        const aD = a.nextAirDate ?? "9999-99-99";
        const bD = b.nextAirDate ?? "9999-99-99";
        if (aD !== bD) return aD < bD ? -1 : 1;
        return a.title.localeCompare(b.title);
      }
      case "added":
        return b.id - a.id;
      default:
        return 0;
    }
  });
  return copy;
}
