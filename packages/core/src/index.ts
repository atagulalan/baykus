export type { CalendarDay, CalendarEntry, CalendarResponse } from "./calendar/query.ts";
export { type LibraryDatabase, type LibraryDb, openLibraryDb } from "./db/open.ts";
export type { AddedVia, ManualList, RatingTargetType, WatchSource } from "./db/schema.ts";
export * as schema from "./db/schema.ts";
export { type CachedImage, getCachedImage } from "./images/cache.ts";
export {
  CATEGORY_ORDER,
  type CategoryInfo,
  computeCategories,
  computeCategory,
  computeCategoryInfo,
  computeDynamicCategories,
  computeDynamicCategory,
  DEFAULT_WATCHING_WINDOW_DAYS,
  type WatchCategory,
} from "./library/category.ts";
export {
  AlreadyInLibraryError,
  isAlreadyInLibraryError,
  isManualListConflictError,
  ManualListConflictError,
} from "./library/errors.ts";
export type { WatchHistoryEntry } from "./library/history.ts";
export { todayUtc } from "./library/progress.ts";
export type { PushSubscriptionRecord } from "./library/push.ts";
export type { Rating } from "./library/ratings.ts";
export { type AddSeriesOptions, createLibrary, type Library } from "./library/service.ts";
export type { Locale, Settings, SettingsPatch, Theme } from "./library/settings.ts";
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
export { type RefreshResult, refreshAll, refreshItem } from "./refresh/engine.ts";
export { type ExportOptions, exportLibraryZip } from "./zip/export.ts";
export {
  type ImportMode,
  type ImportResult,
  importLibraryZip,
  ZipImportError,
  type ZipImportErrorCode,
} from "./zip/import.ts";
