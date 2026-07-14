/**
 * Mirrors specs/001-series-tracking/contracts/api.md. apps/web imports
 * nothing from packages/* (HTTP API only) so these DTOs are redeclared here.
 */

export type MediaType = "series" | "movie" | "book";

export type TrackingStatus = "watching" | "plan_to_watch" | "completed" | "dropped" | "paused";

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
}

export interface SeriesSummary {
  id: number;
  title: string;
  posterRef: string | null;
  year: number | null;
  status: TrackingStatus;
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

export interface SeriesDetail extends SeriesSummary {
  tagline: string | null;
  overview: string | null;
  genres: GenreInfo[];
  originalLanguage: string | null;
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
  suggestCompleted: boolean;
}

export type BulkWatchTarget = { upToEpisodeId: number } | { seasonNumber: number };

export interface BulkWatchResult {
  created: number;
  skippedAlreadyWatched: number;
  suggestCompleted: boolean;
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
