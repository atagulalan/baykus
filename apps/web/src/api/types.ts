/**
 * Mirrors specs/001-series-tracking/contracts/api.md. apps/web imports
 * nothing from packages/* (HTTP API only) so these DTOs are redeclared here.
 */

export type MediaType = "series" | "movie" | "book";

export type ManualList = "watch_later" | "stopped";

export type WatchCategory =
  | "watching"
  | "not_watched_recently"
  | "not_started"
  | "watch_later"
  | "up_to_date"
  | "finished"
  | "stopped";

/** Display order per spec.md E16. */
export const CATEGORY_ORDER: WatchCategory[] = [
  "watching",
  "not_watched_recently",
  "not_started",
  "watch_later",
  "up_to_date",
  "finished",
  "stopped",
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
  posterRef: string | null;
  year: number | null;
  category: WatchCategory;
  manualList: ManualList | null;
  lastWatchedAt: string | null;
  rating: 1 | 2 | 3 | null;
  releaseStatus: string | null;
  network: string | null;
  progress: SeriesProgress;
  nextUnwatched: NextUnwatchedEpisode | null;
  nextAirDate: string | null;
  pushMuted: boolean;
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

export interface Settings {
  locale: Locale;
  region: string;
  theme: Theme;
  scrapersEnabled: boolean;
  tmdbApiKeySet: boolean;
}

export interface SettingsPatch {
  locale?: Locale;
  region?: string;
  theme?: Theme;
  scrapersEnabled?: boolean;
  tmdbApiKey?: string | null;
}

export interface Stats {
  episodesWatched: number;
  watchTimeMin: number;
  itemCount: Record<WatchCategory, number>;
  episodesPerMonth: { month: string; count: number }[];
  ratingDistribution: Record<"1" | "2" | "3", number>;
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
  network: string | null;
  watchProviders: WatchProviderInfo[];
  airDate?: string;
}

export interface CalendarDay {
  date: string;
  entries: CalendarEntry[];
}

export interface CalendarResponse {
  upcoming: CalendarDay[];
  recentlyAired: CalendarEntry[];
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

export interface TvTimeMatchedShow {
  name: string;
  tvdbId: number;
  resolved: ExternalIds;
  episodes: number;
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
}

export interface TvTimeUnmatchedShow {
  name: string;
  episodes: number;
}

export interface TvTimeReport {
  reportId: string;
  matched: TvTimeMatchedShow[];
  fuzzy: TvTimeFuzzyShow[];
  unmatched: TvTimeUnmatchedShow[];
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
