export { type LibraryDatabase, type LibraryDb, openLibraryDb } from "./db/open.ts";
export type { RatingTargetType, TrackingStatus, WatchSource } from "./db/schema.ts";
export * as schema from "./db/schema.ts";
export { type CachedImage, getCachedImage } from "./images/cache.ts";
export { AlreadyInLibraryError, isAlreadyInLibraryError } from "./library/errors.ts";
export { todayUtc } from "./library/progress.ts";
export type { Rating } from "./library/ratings.ts";
export { createLibrary, type Library } from "./library/service.ts";
export type { Stats } from "./library/stats.ts";
export type {
  EpisodeSummary,
  ListSeriesOptions,
  NextUnwatchedEpisode,
  SeasonSummary,
  SeriesDetail,
  SeriesProgress,
  SeriesSummary,
  TrackingPatch,
} from "./library/types.ts";
export type { AddWatchResult, BulkWatchResult, BulkWatchTarget } from "./library/watches.ts";
