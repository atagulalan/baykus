import type { SeriesSummary } from "@baykus/api-client";
import { buildImageUrl } from "@baykus/api-client";
import type { SeriesCardSeries } from "@baykus/ui";

export function toSeriesCardSeries(item: SeriesSummary): SeriesCardSeries {
  return {
    id: item.id,
    title: item.title,
    year: item.year,
    posterUrl: buildImageUrl(item.posterRef, "medium"),
    category: item.category,
    rating: item.rating,
    progress: item.progress,
    seasonProgress: item.seasonProgress,
  };
}
