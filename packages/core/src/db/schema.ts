/**
 * NORMATIVE CONTRACT — the library database schema (one SQLite file per library).
 * Prose mirror: specs/001-series-tracking/data-model.md. When they disagree,
 * THIS FILE wins. The accounts DB (multi mode) is separate and NOT defined here.
 *
 * Conventions:
 * - All timestamps are ISO-8601 UTC strings ("2026-07-13T20:00:00Z").
 * - All dates are plain ISO dates ("2026-07-13").
 * - JSON columns are `text({ mode: "json" })` typed via provider-sdk DTOs.
 * - Image columns store provider refs ("tmdb:/x.jpg"), never bytes/URLs.
 */

import type {
  ContentRating,
  EpisodeType,
  ExternalRating,
  GenreInfo,
  ImageRef,
  MediaType,
  NetworkInfo,
  ReleaseStatus,
  TagInfo,
  WatchProviderInfo,
} from "@baykus/provider-sdk";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export type ManualList = "watch_later" | "stopped";
export type WatchSource = "manual" | "bulk" | "import:tvtime" | "import:zip";
export type RatingTargetType = "item" | "episode";
export type AddedVia = "manual" | "import:tvtime" | "import:zip";

export const items = sqliteTable(
  "items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    tagline: text("tagline"),
    overview: text("overview"),
    posterRef: text("poster_ref").$type<ImageRef>(),
    backdropRef: text("backdrop_ref").$type<ImageRef>(),
    logoRef: text("logo_ref").$type<ImageRef>(),
    releaseStatus: text("release_status").$type<ReleaseStatus>(),
    firstAirDate: text("first_air_date"),
    lastAirDate: text("last_air_date"),
    /** ISO 3166-1 alpha-2, comma-joined if several ("US,GB"). */
    originCountry: text("origin_country"),
    originalLanguage: text("original_language"),
    episodeRunTimes: text("episode_run_times", { mode: "json" }).$type<number[]>(),
    networks: text("networks", { mode: "json" }).$type<NetworkInfo[]>(),
    genres: text("genres", { mode: "json" }).$type<GenreInfo[]>(),
    tags: text("tags", { mode: "json" }).$type<TagInfo[]>(),
    contentRatings: text("content_ratings", { mode: "json" }).$type<ContentRating[]>(),
    tmdbId: integer("tmdb_id").unique(),
    tvmazeId: integer("tvmaze_id").unique(),
    imdbId: text("imdb_id").unique(),
    tvdbId: integer("tvdb_id").unique(),
    watchProviders: text("watch_providers", { mode: "json" }).$type<WatchProviderInfo[]>(),
    externalRatings: text("external_ratings", { mode: "json" }).$type<ExternalRating[]>(),
    lastRefreshedAt: text("last_refreshed_at"),
    addedAt: text("added_at").notNull(),
    addedVia: text("added_via").$type<AddedVia>().notNull().default("manual"),
  },
  (t) => [index("items_media_type_idx").on(t.mediaType)],
);

export const tracking = sqliteTable("tracking", {
  itemId: integer("item_id")
    .primaryKey()
    .references(() => items.id, { onDelete: "cascade" }),
  manualList: text("manual_list").$type<ManualList>(),
  pushMuted: integer("push_muted", { mode: "boolean" }).notNull().default(false),
  note: text("note"),
  listChangedAt: text("list_changed_at").notNull(),
});

export const seasons = sqliteTable(
  "seasons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    /** 0 = specials. */
    number: integer("number").notNull(),
    name: text("name"),
    overview: text("overview"),
    posterRef: text("poster_ref").$type<ImageRef>(),
    airDate: text("air_date"),
  },
  (t) => [uniqueIndex("seasons_item_number_uq").on(t.itemId, t.number)],
);

export const episodes = sqliteTable(
  "episodes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    seasonNumber: integer("season_number").notNull(),
    episodeNumber: integer("episode_number").notNull(),
    title: text("title"),
    overview: text("overview"),
    airDate: text("air_date"),
    runtimeMin: integer("runtime_min"),
    stillRef: text("still_ref").$type<ImageRef>(),
    episodeType: text("episode_type").$type<EpisodeType>(),
    externalRatings: text("external_ratings", { mode: "json" }).$type<ExternalRating[]>(),
  },
  (t) => [
    uniqueIndex("episodes_item_s_e_uq").on(t.itemId, t.seasonNumber, t.episodeNumber),
    index("episodes_air_date_idx").on(t.airDate),
  ],
);

export const watches = sqliteTable(
  "watches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    episodeId: integer("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    watchedAt: text("watched_at").notNull(),
    source: text("source").$type<WatchSource>().notNull().default("manual"),
  },
  (t) => [
    index("watches_episode_idx").on(t.episodeId),
    index("watches_item_idx").on(t.itemId),
    // Idempotent imports: the same watch event never lands twice.
    uniqueIndex("watches_dedupe_uq").on(t.episodeId, t.watchedAt),
  ],
);

export const ratings = sqliteTable(
  "ratings",
  {
    targetType: text("target_type").$type<RatingTargetType>().notNull(),
    /** items.id or episodes.id depending on targetType. */
    targetId: integer("target_id").notNull(),
    /** 1 = kötü, 2 = normal, 3 = iyi. */
    value: integer("value").$type<1 | 2 | 3>().notNull(),
    ratedAt: text("rated_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.targetType, t.targetId] }),
    check("ratings_value_range", sql`${t.value} BETWEEN 1 AND 3`),
  ],
);

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: text("created_at").notNull(),
});

/**
 * Known keys: locale ("tr"|"en"), region ("TR"), tmdb_api_key (single mode
 * only), scrapers_enabled ("0"|"1"), theme ("dark"|"light"|"system"),
 * schema_version (zip schema version this library was created at),
 * watching_window_days (integer days as string, default "30").
 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const refreshLog = sqliteTable(
  "refresh_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Null = a global (whole-library) run. */
    itemId: integer("item_id").references(() => items.id, { onDelete: "set null" }),
    ranAt: text("ran_at").notNull(),
    ok: integer("ok", { mode: "boolean" }).notNull(),
    newEpisodeCount: integer("new_episode_count").notNull().default(0),
    error: text("error"),
  },
  (t) => [index("refresh_log_item_idx").on(t.itemId)],
);
