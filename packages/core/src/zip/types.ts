/**
 * NORMATIVE — the zip format's on-disk JSON shapes. Mirrors
 * specs/001-series-tracking/data-model.md §Zip format. Internal DB ids never
 * leave the zip: items are addressed by ExternalIds, episodes by (s, e).
 */
import type {
  CastMember,
  ContentRating,
  EpisodeType,
  ExternalIds,
  ExternalRating,
  GenreInfo,
  ImageRef,
  MediaType,
  NetworkInfo,
  ReleaseStatus,
  TagInfo,
  WatchProviderInfo,
} from "@baykus/provider-sdk";
import type { AddedVia, ManualList, RatingTargetType, WatchSource } from "../db/schema.ts";

export interface ZipManifest {
  app: "baykus";
  schemaVersion: 6;
  exportedAt: string;
  appVersion: string;
  mediaTypes: MediaType[];
  counts: { items: number; watches: number; ratings: number };
}

export interface ZipEpisodeEntry {
  s: number;
  e: number;
  title: string | null;
  overview: string | null;
  airDate: string | null;
  runtimeMin: number | null;
  type: EpisodeType | null;
  stillRef: ImageRef | null;
  externalRatings: ExternalRating[] | null;
}

export interface ZipSeasonEntry {
  number: number;
  name: string | null;
  overview: string | null;
  posterRef: ImageRef | null;
  airDate: string | null;
  episodes: ZipEpisodeEntry[];
}

export interface ZipItemEntry {
  mediaType: MediaType;
  title: string;
  externalIds: ExternalIds;
  tracking: {
    manualList: ManualList | null;
    pushMuted: boolean;
    note: string | null;
    listChangedAt: string;
    favorite: boolean;
    needsReview: boolean;
  };
  metadata: {
    originalTitle: string | null;
    overview: string | null;
    tagline: string | null;
    releaseStatus: ReleaseStatus | null;
    firstAirDate: string | null;
    lastAirDate: string | null;
    originCountry: string | null;
    originalLanguage: string | null;
    episodeRunTimes: number[] | null;
    networks: NetworkInfo[] | null;
    genres: GenreInfo[] | null;
    tags: TagInfo[] | null;
    cast: CastMember[] | null;
    contentRatings: ContentRating[] | null;
    posterRef: ImageRef | null;
    backdropRef: ImageRef | null;
    logoRef: ImageRef | null;
    watchProviders: WatchProviderInfo[] | null;
    externalRatings: ExternalRating[] | null;
    seasons: ZipSeasonEntry[];
  };
  addedAt: string;
  /** How the item entered the library (E32). */
  addedVia: AddedVia;
  lastRefreshedAt: string | null;
}

export interface ZipWatchEntry {
  series: ExternalIds;
  s: number;
  e: number;
  watchedAt: string;
  source: WatchSource;
  /** E95: absent on pre-v6 zips — treated as false on import (pre-008 watches all read as dated). */
  dateUnknown: boolean;
}

export interface ZipRatingEntry {
  target: RatingTargetType;
  series: ExternalIds;
  s?: number;
  e?: number;
  value: 1 | 2 | 3;
  ratedAt: string;
}

/** Verbatim key/value mirror of the `settings` table. */
export type ZipSettings = Record<string, string>;

/**
 * WP4: the uploaded profile photo — `library/avatar.json`, present only when
 * one is set (omitted, not `null`, when unset — see export.ts). Purely
 * additive alongside the existing four files; doesn't bump SCHEMA_VERSION.
 */
export interface ZipAvatarEntry {
  mimeType: string;
  /** base64-encoded raw bytes. */
  data: string;
}
