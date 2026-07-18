/**
 * Mirrors specs/001-series-tracking/contracts/api.md. apps/web imports
 * nothing from packages/* (HTTP API only) so these DTOs are redeclared here.
 */

export type MediaType = "series" | "movie" | "book";

export type ManualList = "watch_later" | "stopped";

export type WatchCategory =
  | "needs_review"
  | "watching"
  | "not_watched_recently"
  | "not_started"
  | "watch_later"
  | "up_to_date"
  | "finished"
  | "stopped";

/** Display order per spec.md E16. */
export const CATEGORY_ORDER: WatchCategory[] = [
  "needs_review",
  "watching",
  "not_watched_recently",
  "not_started",
  "watch_later",
  "up_to_date",
  "finished",
  "stopped",
];

/** E59: the five categories the library home page groups by — finished/stopped live in all-series. */
export const HOME_CATEGORY_ORDER: WatchCategory[] = [
  "needs_review",
  "watching",
  "not_watched_recently",
  "not_started",
  "watch_later",
  "up_to_date",
];

export interface ExternalIds {
  tmdbId?: number;
  tvmazeId?: number;
  imdbId?: string;
  tvdbId?: number;
}

export interface SearchResult {
  providerId: string;
  mediaType: MediaType;
  externalIds: ExternalIds;
  title: string;
  originalTitle?: string;
  year?: number;
  overview?: string;
  posterRef?: string;
  network?: string;
  score?: number;
  /** Set by GET /api/search when any external id already matches a library item. */
  libraryItemId?: number;
}

/** GET /api/search/preview — provider metadata for a show not yet added (E131). */
export interface SeriesPreview {
  externalIds: ExternalIds;
  title: string;
  year: number | null;
  overview: string | null;
  posterRef: string | null;
  backdropRef: string | null;
  tagline: string | null;
  network: string | null;
  genres: GenreInfo[];
  releaseStatus: string | null;
  libraryItemId: number | null;
  /** Full inventory; episode ids are synthetic (s/e encoded) until the show is added. */
  seasons: SeasonSummary[];
}

export interface SearchResponse {
  items: SearchResult[];
  total: number;
}

export interface SeriesProgress {
  watched: number;
  aired: number;
  total: number;
}

export interface SeasonProgressEntry {
  number: number;
  watched: number;
  total: number;
}

export interface SeasonProgress {
  seasons: SeasonProgressEntry[];
  sequential: boolean;
}

export interface NextUnwatchedEpisode {
  episodeId: number;
  s: number;
  e: number;
  title: string | null;
  airDate: string | null;
  episodeType: EpisodeType | null;
}

export interface SeriesSummary {
  id: number;
  title: string;
  /** E52: TMDB-parity URL identity — null until a resolving/refreshing provider supplies one. */
  tmdbId: number | null;
  posterRef: string | null;
  /** WP4: sourced for the profile banner picker (backdrops of watched series). */
  backdropRef: string | null;
  year: number | null;
  category: WatchCategory;
  manualList: ManualList | null;
  lastWatchedAt: string | null;
  rating: 1 | 2 | 3 | null;
  releaseStatus: string | null;
  network: string | null;
  progress: SeriesProgress;
  seasonProgress: SeasonProgress;
  nextUnwatched: NextUnwatchedEpisode | null;
  nextAirDate: string | null;
  pushMuted: boolean;
  favorite: boolean;
  needsReview: boolean;
}

export interface SeriesListResponse {
  items: SeriesSummary[];
  total: number;
}

export type EpisodeType = "standard" | "mid_season" | "finale";

export interface CommunityRating {
  source: string;
  value: number;
  scale: number;
  votes?: number;
}

export interface EpisodeSummary {
  id: number;
  s: number;
  e: number;
  title: string | null;
  overview: string | null;
  airDate: string | null;
  runtimeMin: number | null;
  stillRef: string | null;
  episodeType: EpisodeType | null;
  communityRating: CommunityRating | null;
  myRating: 1 | 2 | 3 | null;
  watchCount: number;
  lastWatchedAt: string | null;
}

export interface SeasonSummary {
  number: number;
  name: string | null;
  overview: string | null;
  posterRef: string | null;
  airDate: string | null;
  episodes: EpisodeSummary[];
}

export interface GenreInfo {
  id?: number;
  name: string;
}

export interface ContentRating {
  region: string;
  rating: string;
}

export interface NetworkInfo {
  id?: number;
  name: string;
  logoRef?: string | null;
  originCountry?: string;
}

export type WatchProviderType = "flatrate" | "rent" | "buy" | "ads" | "free";

export interface WatchProviderInfo {
  provider: string;
  providerId?: number;
  type: WatchProviderType;
  region: string;
  logoRef?: string | null;
}

export interface ExternalRating {
  source: string;
  value: number;
  scale: number;
  votes?: number;
  distribution?: Record<string, number>;
  fetchedAt: string;
}

export interface TagInfo {
  source: string;
  id?: number | string;
  name: string;
}

export interface SeriesDetail extends SeriesSummary {
  tagline: string | null;
  overview: string | null;
  genres: GenreInfo[];
  tags: TagInfo[];
  contentRatings: ContentRating[];
  networks: NetworkInfo[];
  originalLanguage: string | null;
  /** Typical episode runtimes in minutes (provider); UI shows the average. */
  episodeRunTimes: number[];
  watchProviders: WatchProviderInfo[];
  externalRatings: ExternalRating[];
  backdropRef: string | null;
  logoRef: string | null;
  note: string | null;
  lastRefreshedAt: string | null;
  addedAt: string;
  seasons: SeasonSummary[];
}

export interface AddWatchResult {
  id: number;
  episodeId: number;
  watchedAt: string;
  source: string;
}

export type BulkWatchTarget = { upToEpisodeId: number } | { seasonNumber: number };

export interface BulkWatchResult {
  created: number;
  skippedAlreadyWatched: number;
}

export interface ApiErrorEnvelope {
  error: { code: string; message: string; details: unknown };
}

export type RatingTargetType = "item" | "episode";

export interface Rating {
  targetType: RatingTargetType;
  targetId: number;
  value: 1 | 2 | 3;
  ratedAt: string;
}

export type Locale = "tr" | "en";
export type Theme = "dark" | "light" | "system";
export type EpisodeLabelFormat = "SxEy" | "S01E06" | "compact";
export type DefaultStartPage = "home" | "calendar" | "stats";
export type NewSeriesDefaultStatus = "watching" | "watchlist";

/** Browse chrome prefs — mirrored from settings.ui_prefs (E143). */
export type BrowseView = "list" | "grid";

export interface UiPrefsDto {
  libraryBrowse: {
    sort: string;
    category: string[];
  };
  watchSections: string[];
  watchSectionSorts: Record<string, string>;
  historyCollapsed: boolean;
  skipSectionRemoveConfirm: boolean;
  showNextUpCarousel: boolean;
  browseView: BrowseView;
}

export interface Settings {
  locale: Locale;
  region: string;
  theme: Theme;
  scrapersEnabled: boolean;
  tmdbApiKeySet: boolean;
  watchingWindowDays: number;
  episodeLabelFormat: EpisodeLabelFormat;
  spoilerProtection: boolean;
  defaultStartPage: DefaultStartPage;
  newSeriesDefaultStatus: NewSeriesDefaultStatus;
  uiPrefs: UiPrefsDto | null;
  /** WP4: chosen profile banner — an ImageRef of a watched series' backdrop, or null. */
  bannerRef: string | null;
  /** WP4: opaque cache-busting token for the uploaded profile photo, or null if unset. */
  avatarRef: string | null;
}

export interface SettingsPatch {
  locale?: Locale;
  region?: string;
  theme?: Theme;
  scrapersEnabled?: boolean;
  tmdbApiKey?: string | null;
  watchingWindowDays?: number;
  episodeLabelFormat?: EpisodeLabelFormat;
  spoilerProtection?: boolean;
  defaultStartPage?: DefaultStartPage;
  newSeriesDefaultStatus?: NewSeriesDefaultStatus;
  uiPrefs?: UiPrefsDto | null;
  bannerRef?: string | null;
}

export interface RewatchedEpisode {
  itemId: number;
  itemTitle: string;
  episodeId: number;
  s: number;
  e: number;
  episodeTitle: string | null;
  watchCount: number;
}

export interface NamedCount {
  name: string;
  episodes: number;
}

export interface SeriesEpisodeProgress {
  itemId: number;
  title: string;
  watchedEpisodes: number;
  airedEpisodes: number;
}

/** 008 contracts/api.md §stats delta — additive over 001/007 (E111). */
export interface Stats {
  episodesWatched: number;
  watchTimeMin: number;
  itemCount: Record<WatchCategory, number>;
  episodesPerMonth: { month: string; count: number }[];
  ratingDistribution: Record<"1" | "2" | "3", number>;
  mostRewatched: RewatchedEpisode[];

  seriesCount: number;
  favoritesCount: number;
  datedWatches: { dated: number; total: number };
  recent: {
    last7Days: { episodes: number; watchTimeMin: number };
    last30Days: { episodes: number; watchTimeMin: number };
    thisMonth: { episodes: number; watchTimeMin: number };
  };
  mostWatchedByTime: { itemId: number; title: string; watchTimeMin: number }[];
  favoriteProgress: SeriesEpisodeProgress[];
  production: {
    ongoing: number;
    ended: number;
    ongoingItems: SeriesEpisodeProgress[];
  };
  genreDistribution: { top: NamedCount[]; other: number };
  networkDistribution: { networkCount: number; top: NamedCount[]; other: number };
  backlog: {
    episodes: number;
    seriesCount: number;
    watchTimeMin: number;
    topSeries: { itemId: number; title: string; episodes: number }[];
  };
  pace: { episodesPerWeek: number; projectedWeeks: number } | null;
  upcoming: { months: { month: string; episodes: number; watchTimeMin: number }[] };
  binges: { itemId: number; title: string; date: string; episodes: number }[];
  rewatchSummary: {
    totalRewatches: number;
    rewatchedEpisodes: number;
    bySeries: { itemId: number; title: string; rewatches: number }[];
  };
  streaks: {
    longestWeeks: number;
    currentWeeks: number;
    bySeries: { itemId: number; title: string; weeks: number }[];
  };
  timeByYear: {
    year: number;
    totalMin: number;
    monthlyMin: number[];
    weeklyMin: { week: number; min: number }[];
  }[];
  activityByDay: { date: string; count: number }[];
  byWeekday: number[];
  byHour: number[];
}

export interface RefreshResult {
  itemId: number;
  ok: boolean;
  newEpisodes: number;
  refreshedAt: string;
}

export interface RefreshProgressEvent {
  done: number;
  total: number;
  itemId: number;
  ok: boolean;
  newEpisodes: number;
  error?: string;
}

export interface RefreshCompleteEvent {
  ok: number;
  failed: number;
  newEpisodes: number;
}

export interface CalendarEntry {
  itemId: number;
  title: string;
  posterRef: string | null;
  episodeId: number;
  s: number;
  e: number;
  episodeTitle: string | null;
  episodeType: EpisodeType | null;
  /** From seasons.name — feeds the OVA heuristic (E23). */
  seasonName: string | null;
  airDate: string;
  network: string | null;
  watchProviders: WatchProviderInfo[];
  isWatched: boolean;
}

export interface CalendarDay {
  date: string;
  entries: CalendarEntry[];
}

export interface CalendarResponse {
  days: CalendarDay[];
  hasMoreFuture?: boolean;
  hasMorePast?: boolean;
}

export interface WatchHistoryEntry {
  watchId: number;
  watchedAt: string;
  source: string;
  itemId: number;
  title: string;
  posterRef: string | null;
  episodeId: number;
  s: number;
  e: number;
  episodeTitle: string | null;
  airDate: string | null;
  episodeType: EpisodeType | null;
}

export interface WatchHistoryResponse {
  items: WatchHistoryEntry[];
  total: number;
}

export type ImportMode = "replace" | "merge";

export interface ImportZipResult {
  items: number;
  watches: number;
  ratings: number;
  mode: ImportMode;
  warnings: string[];
}

export type AuthMode = "single" | "multi";

export interface AuthSession {
  authenticated: boolean;
  handle: string | null;
  mode: AuthMode;
}

export interface ClaimResult {
  handle: string;
  createdAt: string;
}

export interface UnderflowSeasonDetail {
  seasonNumber: number;
  tvTimeCount: number;
  providerCount: number;
  delta: number;
}

export interface TvTimeMatchedShow {
  name: string;
  tvdbId: number;
  resolved: ExternalIds;
  episodes: number;
  providerEpisodeCount: number;
  underflowDetails: UnderflowSeasonDetail[];
}

export interface TvTimeFuzzyCandidate {
  externalIds: ExternalIds;
  title: string;
  year?: number;
}

export interface TvTimeFuzzyShow {
  name: string;
  candidates: TvTimeFuzzyCandidate[];
  episodes: number;
  underflowDetails: UnderflowSeasonDetail[];
}

export interface TvTimeUnmatchedShow {
  name: string;
  episodes: number;
}

export interface TvTimeSkippedRelic {
  name: string;
  tvdbId: number;
}

export interface TvTimeReport {
  reportId: string;
  matched: TvTimeMatchedShow[];
  fuzzy: TvTimeFuzzyShow[];
  unmatched: TvTimeUnmatchedShow[];
  skippedRelics: TvTimeSkippedRelic[];
}

export interface TvTimeImportProgressEvent {
  done: number;
  total: number;
  name: string;
  status: "matched" | "fuzzy" | "unmatched";
}

export interface TvTimeConfirmProgressEvent {
  done: number;
  total: number;
  name: string;
  ok: boolean;
}

export interface TvTimeConfirmResult {
  itemsCreated: number;
  watchesCreated: number;
  skipped: number;
}
