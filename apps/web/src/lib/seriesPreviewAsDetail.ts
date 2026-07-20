import type { SeasonProgress, SeriesDetail, SeriesPreview } from "../api/types.ts";
import { isEpisodeAired } from "./airing.ts";

/** Map preview DTO → SeriesDetail so /series/new can reuse the detail page chrome. */
export function seriesPreviewAsDetail(preview: SeriesPreview): SeriesDetail {
  let aired = 0;
  let total = 0;
  const seasonEntries: SeasonProgress["seasons"] = [];

  for (const season of preview.seasons) {
    if (season.number === 0) continue;
    let airedCount = 0;
    let announcedCount = 0;
    for (const ep of season.episodes) {
      announcedCount += 1;
      if (isEpisodeAired(ep)) {
        airedCount += 1;
        aired += 1;
      }
    }
    total += announcedCount;
    // E50: omit zero-aired seasons from the segmented bar.
    if (airedCount === 0) continue;
    seasonEntries.push({
      number: season.number,
      watched: 0,
      total: airedCount,
      announced: announcedCount,
    });
  }

  const networks =
    preview.networks.length > 0
      ? preview.networks
      : preview.network
        ? [{ name: preview.network }]
        : [];

  return {
    id: 0,
    title: preview.title,
    tmdbId: preview.externalIds.tmdbId ?? null,
    posterRef: preview.posterRef,
    backdropRef: preview.backdropRef,
    year: preview.year,
    category: "not_started",
    manualList: null,
    lastWatchedAt: null,
    rating: null,
    releaseStatus: preview.releaseStatus,
    network: preview.network ?? networks[0]?.name ?? null,
    progress: { watched: 0, aired, total },
    seasonProgress: { seasons: seasonEntries, sequential: true },
    nextUnwatched: null,
    nextAirDate: null,
    pushMuted: false,
    favorite: false,
    needsReview: false,
    tagline: preview.tagline,
    overview: preview.overview,
    genres: preview.genres,
    tags: preview.tags,
    cast: preview.cast,
    contentRatings: preview.contentRatings,
    networks,
    originalLanguage: preview.originalLanguage,
    episodeRunTimes: preview.episodeRunTimes,
    watchProviders: preview.watchProviders,
    externalRatings: preview.externalRatings,
    logoRef: null,
    note: null,
    lastRefreshedAt: null,
    addedAt: new Date(0).toISOString(),
    seasons: preview.seasons,
  };
}
