import type {
  ContentRating,
  EpisodeType,
  ExternalRating,
  GenreInfo,
  ImageRef,
  NetworkInfo,
  ReleaseStatus,
  TagInfo,
  WatchProviderInfo,
} from "@baykus/provider-sdk";
import type { TrackingStatus } from "../db/schema.ts";
import type { NextUnwatchedEpisode, SeriesProgress } from "./progress.ts";

export type { NextUnwatchedEpisode, SeriesProgress };

export interface SeriesSummary {
  id: number;
  title: string;
  posterRef: ImageRef | null;
  year: number | null;
  status: TrackingStatus;
  /** My item rating (1-3), or null if unrated. */
  rating: 1 | 2 | 3 | null;
  releaseStatus: ReleaseStatus | null;
  network: string | null;
  progress: SeriesProgress;
  nextUnwatched: NextUnwatchedEpisode | null;
  nextAirDate: string | null;
  pushMuted: boolean;
}

export interface EpisodeSummary {
  id: number;
  s: number;
  e: number;
  title: string | null;
  overview: string | null;
  airDate: string | null;
  runtimeMin: number | null;
  stillRef: ImageRef | null;
  episodeType: EpisodeType | null;
  communityRating: ExternalRating | null;
  myRating: 1 | 2 | 3 | null;
  watchCount: number;
  lastWatchedAt: string | null;
}

export interface SeasonSummary {
  number: number;
  name: string | null;
  overview: string | null;
  posterRef: ImageRef | null;
  airDate: string | null;
  episodes: EpisodeSummary[];
}

export interface SeriesDetail extends SeriesSummary {
  tagline: string | null;
  overview: string | null;
  genres: GenreInfo[];
  tags: TagInfo[];
  contentRatings: ContentRating[];
  networks: NetworkInfo[];
  originCountry: string[];
  originalLanguage: string | null;
  episodeRunTimes: number[];
  watchProviders: WatchProviderInfo[];
  externalRatings: ExternalRating[];
  backdropRef: ImageRef | null;
  logoRef: ImageRef | null;
  note: string | null;
  lastRefreshedAt: string | null;
  addedAt: string;
  seasons: SeasonSummary[];
}

export interface ListSeriesOptions {
  status?: TrackingStatus;
  sort?: "title" | "added" | "rating" | "nextAir";
}
