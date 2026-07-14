/**
 * NORMATIVE CONTRACT — every provider and the core map to exactly these shapes.
 * Prose mirrors live in specs/001-series-tracking/data-model.md; when they
 * disagree, THIS FILE wins. Do not add/rename fields casually: the zip format
 * and the DB schema derive from these.
 */

export type MediaType = "series" | "movie" | "book";

/**
 * Provider-scoped image reference, serialized as `<providerId>:<path>`.
 * Example: "tmdb:/okrubNzXkGSa6LgrBKRz0eaviHn.jpg".
 * Only refs are persisted — bytes live in the disposable image cache.
 */
export type ImageRef = `${string}:${string}`;

export type ImageKind = "poster" | "backdrop" | "still" | "logo" | "tag";

/** Requested rendering size; providers map these to their own size buckets. */
export type ImageSize = "thumb" | "medium" | "large" | "original";

/**
 * Cross-provider identity. At least one field must be set.
 * Two items are the same when ANY id matches (union-join on import/merge).
 */
export interface ExternalIds {
  tmdbId?: number;
  tvmazeId?: number;
  /** IMDb id including the "tt" prefix, e.g. "tt11280740". */
  imdbId?: string;
  tvdbId?: number;
}

export interface SearchOptions {
  /** Default "series". */
  mediaType?: MediaType;
  /** Default 10, max 50. */
  limit?: number;
  /** BCP-47 tag, e.g. "tr-TR". Providers may ignore. */
  language?: string;
}

export interface SearchResult {
  providerId: string;
  mediaType: MediaType;
  externalIds: ExternalIds;
  title: string;
  originalTitle?: string;
  /** First-air year, for disambiguation in the UI. */
  year?: number;
  overview?: string;
  posterRef?: ImageRef;
  network?: string;
  /** Provider relevance score normalized to 0..1, higher = better. */
  score?: number;
}

export interface NetworkInfo {
  id?: number;
  name: string;
  logoRef?: ImageRef;
  /** ISO 3166-1 alpha-2, e.g. "US". */
  originCountry?: string;
}

export interface GenreInfo {
  /** TMDB genre id when sourced from TMDB. */
  id?: number;
  name: string;
}

/** Curated tag, e.g. a Serializd nanogenre. */
export interface TagInfo {
  /** Provider id that produced the tag, e.g. "serializd". */
  source: string;
  id?: number | string;
  name: string;
  imageRef?: ImageRef;
}

export interface ContentRating {
  /** ISO 3166-1 alpha-2, e.g. "US". */
  region: string;
  /** e.g. "TV-MA". */
  rating: string;
}

export type WatchProviderType = "flatrate" | "rent" | "buy" | "ads" | "free";

export interface WatchProviderInfo {
  /** Display name, e.g. "Netflix". */
  provider: string;
  /** TMDB/JustWatch provider id when known. */
  providerId?: number;
  type: WatchProviderType;
  /** ISO 3166-1 alpha-2 region the availability applies to. */
  region: string;
  logoRef?: ImageRef;
  /** e.g. "4k", "hd" when the source exposes it. */
  presentationType?: string;
}

export interface ExternalRating {
  /** "imdb" | "tmdb" | "serializd" | future sources. */
  source: string;
  value: number;
  /** The scale the value is on: 10 for IMDb/TMDB, 5 for Serializd-normalized, etc. */
  scale: number;
  votes?: number;
  /** Per-step vote counts when the source exposes them, keys are rating steps as strings. */
  distribution?: Record<string, number>;
  /** ISO datetime (UTC) of when we fetched it. */
  fetchedAt: string;
}

export type EpisodeType = "standard" | "mid_season" | "finale";

export interface EpisodeDetails {
  seasonNumber: number;
  episodeNumber: number;
  title?: string;
  overview?: string;
  /**
   * ISO date "YYYY-MM-DD" — the provider's plain air date, NOT a timestamp.
   * Airedness rule (spec.md edge cases): aired ⇔ airDate <= today's UTC date.
   */
  airDate?: string;
  runtimeMin?: number;
  stillRef?: ImageRef;
  episodeType?: EpisodeType;
  externalRatings?: ExternalRating[];
}

export interface SeasonDetails {
  /** 0 = specials. */
  number: number;
  name?: string;
  overview?: string;
  posterRef?: ImageRef;
  airDate?: string;
  episodes: EpisodeDetails[];
}

export type ReleaseStatus =
  | "returning"
  | "ended"
  | "canceled"
  | "in_production"
  | "planned"
  | "pilot";

export interface SeriesDetails {
  providerId: string;
  mediaType: "series";
  externalIds: ExternalIds;
  title: string;
  originalTitle?: string;
  tagline?: string;
  overview?: string;
  releaseStatus?: ReleaseStatus;
  firstAirDate?: string;
  lastAirDate?: string;
  /** ISO 3166-1 alpha-2 codes. */
  originCountry?: string[];
  /** ISO 639-1, e.g. "en". */
  originalLanguage?: string;
  /** Typical episode runtimes in minutes. */
  episodeRunTimes?: number[];
  networks?: NetworkInfo[];
  genres?: GenreInfo[];
  contentRatings?: ContentRating[];
  posterRef?: ImageRef;
  backdropRef?: ImageRef;
  logoRef?: ImageRef;
  /** Complete season/episode inventory, specials included as season 0. */
  seasons: SeasonDetails[];
}

export interface ProviderCapabilities {
  search: boolean;
  /** Full season/episode inventory via getSeriesDetails. */
  details: boolean;
  /** Reliable future air dates. */
  upcoming: boolean;
  /** Streaming platform availability. */
  watchProviders: boolean;
  externalRatings: boolean;
  /** Curated tags / nanogenres. */
  tags: boolean;
  images: boolean;
}

export interface EpisodePosition {
  seasonNumber: number;
  episodeNumber: number;
}

export interface MetadataProvider {
  /** Stable lowercase id: "tmdb", "tvmaze", "imdb", "serializd". */
  readonly id: string;
  readonly mediaTypes: readonly MediaType[];
  readonly capabilities: ProviderCapabilities;
  readonly requiresApiKey: boolean;

  search(query: string, opts?: SearchOptions): Promise<SearchResult[]>;
  getSeriesDetails(ref: ExternalIds): Promise<SeriesDetails>;
  getWatchProviders?(ref: ExternalIds, region: string): Promise<WatchProviderInfo[]>;
  getExternalRatings?(ref: ExternalIds): Promise<ExternalRating[]>;
  getTags?(ref: ExternalIds): Promise<TagInfo[]>;
  /**
   * Resolves a bare TheTVDB *episode* id (as opposed to a show id) to its
   * (season, episode) position — TMDB-only (`/find` supports tv_episode
   * results keyed by external tvdb id); used by the TV Time importer, which
   * only ever receives TV Time's own per-episode TVDB ids, never s/e numbers.
   * Returns null when the provider has no matching episode.
   */
  findEpisodeByTvdbId?(tvdbEpisodeId: number): Promise<EpisodePosition | null>;
  /** Resolve a persisted ImageRef to a fetchable CDN URL. */
  resolveImageUrl(ref: ImageRef, size: ImageSize): string;
}
