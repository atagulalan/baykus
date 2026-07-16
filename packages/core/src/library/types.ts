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
import type { ManualList } from "../db/schema.ts";
import type { WatchCategory } from "./category.ts";
import type { NextUnwatchedEpisode, SeasonProgress, SeriesProgress } from "./progress.ts";

export type { NextUnwatchedEpisode, SeasonProgress, SeriesProgress };

export interface SeriesSummary {
  id: number;
  title: string;
  /** E52: TMDB-parity URL identity — null until a resolving/refreshing provider supplies one. */
  tmdbId: number | null;
  posterRef: ImageRef | null;
  year: number | null;
  category: WatchCategory;
  manualList: ManualList | null;
  /** Max watched_at over non-special watches, or null if never watched. */
  lastWatchedAt: string | null;
  /** My item rating (1-3), or null if unrated. */
  rating: 1 | 2 | 3 | null;
  releaseStatus: ReleaseStatus | null;
  network: string | null;
  progress: SeriesProgress;
  seasonProgress: SeasonProgress;
  nextUnwatched: NextUnwatchedEpisode | null;
  nextAirDate: string | null;
  pushMuted: boolean;
  favorite: boolean;
  needsReview: boolean;
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
  category?: WatchCategory;
  sort?: "title" | "added" | "rating" | "nextAir" | "lastWatched";
}

/** Partial update to a series' tracking row; any subset of fields. */
export interface TrackingPatch {
  manualList?: ManualList | null;
  pushMuted?: boolean;
  note?: string | null;
  /** E62: favorite-only updates never bump listChangedAt (that's manual-list semantics, 002). */
  favorite?: boolean;
  needsReview?: boolean;
}
