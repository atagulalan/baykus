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

export interface ApiErrorEnvelope {
  error: { code: string; message: string; details: unknown };
}
