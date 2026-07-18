import type {
  CastMember,
  ExternalIds,
  ExternalRating,
  MetadataProvider,
  SeriesDetails,
  TagInfo,
  WatchProviderInfo,
} from "@baykus/provider-sdk";
import type { Archiver } from "archiver";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { type CalendarResponse, getCalendar } from "../calendar/query.ts";
import type { LibraryDatabase } from "../db/open.ts";
import type { AddedVia, ManualList, RatingTargetType, WatchSource } from "../db/schema.ts";
import * as schema from "../db/schema.ts";
import {
  filterStaleItemIds,
  type RefreshAllOptions,
  type RefreshResult,
  refreshAll,
  refreshItem,
} from "../refresh/engine.ts";
import { type ExportOptions, exportLibraryZip } from "../zip/export.ts";
import { type ImportMode, type ImportResult, importLibraryZip } from "../zip/import.ts";
import {
  type CategoryInfo,
  computeCategoryInfo,
  computeDynamicCategories,
  computeDynamicCategory,
} from "./category.ts";
import { AlreadyInLibraryError, ManualListConflictError } from "./errors.ts";
import { getWatchHistory, type WatchHistoryEntry } from "./history.ts";
import {
  getNextAirDate,
  getNextUnwatchedEpisode,
  getSeasonProgress,
  getSeriesProgress,
} from "./progress.ts";
import {
  addPushSubscription,
  listPushSubscriptions,
  type PushSubscriptionRecord,
  removePushSubscription,
} from "./push.ts";
import { clearRating, getRating, type Rating, setRating } from "./ratings.ts";
import {
  type AvatarData,
  clearAvatar,
  getAvatar,
  getSettings,
  getTmdbApiKey,
  type Settings,
  type SettingsPatch,
  setAvatar,
  updateSettings,
} from "./settings.ts";
import { getStats, type Stats } from "./stats/index.ts";
import type {
  EpisodeSummary,
  ListSeriesOptions,
  SeasonSummary,
  SeriesDetail,
  SeriesSummary,
  TrackingPatch,
} from "./types.ts";
import {
  type AddWatchResult,
  addWatch,
  type BulkUnwatchResult,
  type BulkWatchResult,
  type BulkWatchTarget,
  bulkUnwatch,
  bulkWatch,
  removeLatestWatch,
} from "./watches.ts";

type ItemRow = typeof schema.items.$inferSelect;
type TrackingRow = typeof schema.tracking.$inferSelect;

function findConflictingItemId(db: LibraryDatabase, ids: ExternalIds): number | null {
  const conditions = [
    ids.tmdbId != null ? eq(schema.items.tmdbId, ids.tmdbId) : null,
    ids.tvmazeId != null ? eq(schema.items.tvmazeId, ids.tvmazeId) : null,
    ids.imdbId != null ? eq(schema.items.imdbId, ids.imdbId) : null,
    ids.tvdbId != null ? eq(schema.items.tvdbId, ids.tvdbId) : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null);

  if (conditions.length === 0) return null;

  const row = db
    .select({ id: schema.items.id })
    .from(schema.items)
    .where(or(...conditions))
    .limit(1)
    .get();
  return row?.id ?? null;
}

function toItemInsertValues(
  details: SeriesDetails,
  addedAt: string,
  addedVia: AddedVia,
  externalRatings: ExternalRating[] | null,
  watchProviders: WatchProviderInfo[] | null,
  tags: TagInfo[] | null,
  cast: CastMember[] | null,
) {
  return {
    mediaType: details.mediaType,
    title: details.title,
    originalTitle: details.originalTitle ?? null,
    tagline: details.tagline ?? null,
    overview: details.overview ?? null,
    posterRef: details.posterRef ?? null,
    backdropRef: details.backdropRef ?? null,
    logoRef: details.logoRef ?? null,
    releaseStatus: details.releaseStatus ?? null,
    firstAirDate: details.firstAirDate ?? null,
    lastAirDate: details.lastAirDate ?? null,
    originCountry:
      details.originCountry && details.originCountry.length > 0
        ? details.originCountry.join(",")
        : null,
    originalLanguage: details.originalLanguage ?? null,
    episodeRunTimes: details.episodeRunTimes ?? null,
    networks: details.networks ?? null,
    genres: details.genres ?? null,
    tags: tags && tags.length > 0 ? tags : null,
    cast: cast && cast.length > 0 ? cast : null,
    contentRatings: details.contentRatings ?? null,
    tmdbId: details.externalIds.tmdbId ?? null,
    tvmazeId: details.externalIds.tvmazeId ?? null,
    imdbId: details.externalIds.imdbId ?? null,
    tvdbId: details.externalIds.tvdbId ?? null,
    watchProviders: watchProviders && watchProviders.length > 0 ? watchProviders : null,
    externalRatings: externalRatings && externalRatings.length > 0 ? externalRatings : null,
    lastRefreshedAt: addedAt,
    addedAt,
    addedVia,
  };
}

function yearOf(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const year = Number.parseInt(dateStr.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function buildSummary(
  db: LibraryDatabase,
  item: ItemRow,
  tracking: TrackingRow,
  categoryInfo: CategoryInfo,
): SeriesSummary {
  return {
    id: item.id,
    title: item.title,
    tmdbId: item.tmdbId,
    posterRef: item.posterRef,
    backdropRef: item.backdropRef,
    year: yearOf(item.firstAirDate),
    category: categoryInfo.category,
    manualList: tracking.manualList,
    lastWatchedAt: categoryInfo.lastWatchedAt,
    rating: getRating(db, "item", item.id)?.value ?? null,
    releaseStatus: item.releaseStatus,
    network: item.networks?.[0]?.name ?? null,
    progress: getSeriesProgress(db, item.id),
    seasonProgress: getSeasonProgress(db, item.id),
    nextUnwatched: getNextUnwatchedEpisode(db, item.id),
    nextAirDate: getNextAirDate(db, item.id),
    pushMuted: tracking.pushMuted,
    favorite: tracking.favorite,
    needsReview: tracking.needsReview,
  };
}

function getItemAndTracking(
  db: LibraryDatabase,
  itemId: number,
): { item: ItemRow; tracking: TrackingRow } | undefined {
  return db
    .select({ item: schema.items, tracking: schema.tracking })
    .from(schema.items)
    .innerJoin(schema.tracking, eq(schema.tracking.itemId, schema.items.id))
    .where(eq(schema.items.id, itemId))
    .get();
}

function requireCategoryInfo(map: Map<number, CategoryInfo>, itemId: number): CategoryInfo {
  const info = map.get(itemId);
  if (!info) throw new Error(`category info missing for itemId=${itemId}`);
  return info;
}

type SortKey = NonNullable<ListSeriesOptions["sort"]>;

function sortEnriched(
  enriched: { addedAt: string; summary: SeriesSummary }[],
  sort: SortKey,
): void {
  switch (sort) {
    case "title":
      enriched.sort((a, b) => a.summary.title.localeCompare(b.summary.title, "tr"));
      return;
    case "rating":
      enriched.sort((a, b) => (b.summary.rating ?? 0) - (a.summary.rating ?? 0));
      return;
    case "nextAir":
      enriched.sort((a, b) => {
        if (a.summary.nextAirDate === b.summary.nextAirDate) return 0;
        if (a.summary.nextAirDate === null) return 1;
        if (b.summary.nextAirDate === null) return -1;
        return a.summary.nextAirDate < b.summary.nextAirDate ? -1 : 1;
      });
      return;
    case "lastWatched":
      enriched.sort((a, b) => {
        if (a.summary.lastWatchedAt === b.summary.lastWatchedAt) return 0;
        if (a.summary.lastWatchedAt === null) return 1;
        if (b.summary.lastWatchedAt === null) return -1;
        // Most recently watched first.
        return a.summary.lastWatchedAt < b.summary.lastWatchedAt ? 1 : -1;
      });
      return;
    default:
      // "added" — most recently added first.
      enriched.sort((a, b) => (a.addedAt < b.addedAt ? 1 : a.addedAt > b.addedAt ? -1 : 0));
  }
}

export interface AddSeriesOptions {
  manualList?: ManualList;
  externalRatings?: ExternalRating[];
  watchProviders?: WatchProviderInfo[];
  tags?: TagInfo[];
  cast?: CastMember[];
  /** How the item entered the library (E32). Defaults to "manual". */
  addedVia?: AddedVia;
  needsReview?: boolean;
}

export interface Library {
  addSeries(details: SeriesDetails, opts?: AddSeriesOptions): SeriesSummary;
  /** Returns the library item id when any external id already matches, else null. */
  findItemIdByExternalIds(ids: ExternalIds): number | null;
  listSeries(opts?: ListSeriesOptions): { items: SeriesSummary[]; total: number };
  getSeries(id: number): SeriesDetail | null;
  removeSeries(id: number): boolean;
  /** Danger zone (Settings): irreversibly deletes every row in the library. */
  resetLibrary(): void;
  /** E20 guard: throws ManualListConflictError when manualList="stopped" on a dynamically-finished series. */
  updateTracking(itemId: number, patch: TrackingPatch): SeriesSummary | null;
  /** E26 cleanup: clears manual_list='stopped' on items whose dynamic category is finished — for import
   * paths (zip, TV Time) that write tracking directly and so bypass the E20 live guard. */
  clearStaleStoppedLists(): void;
  addWatch(
    episodeId: number,
    watchedAt?: string,
    source?: WatchSource,
    opts?: { dateUnknown?: boolean },
  ): AddWatchResult | null;
  bulkWatch(itemId: number, target: BulkWatchTarget): BulkWatchResult | null;
  bulkUnwatch(itemId: number, target: BulkWatchTarget): BulkUnwatchResult | null;
  removeLatestWatch(episodeId: number): boolean;
  setRating(targetType: RatingTargetType, targetId: number, value: 1 | 2 | 3): Rating;
  clearRating(targetType: RatingTargetType, targetId: number): boolean;
  getStats(tz?: string): Stats;
  getSettings(): Settings;
  updateSettings(patch: SettingsPatch): Settings;
  /** Internal use only (provider registry wiring) — never serialize this over the API. */
  getTmdbApiKey(): string | undefined;
  /** WP4: stores the uploaded profile photo's bytes and returns the refreshed Settings. */
  setAvatar(mimeType: string, data: Buffer): Settings;
  /** WP4: the raw bytes+mime backing GET /api/settings/avatar, or undefined if unset. */
  getAvatar(): AvatarData | undefined;
  refreshItem(provider: MetadataProvider, itemId: number): Promise<RefreshResult>;
  refreshAll(
    provider: MetadataProvider,
    itemIds: number[],
    concurrency?: number,
    opts?: RefreshAllOptions,
  ): AsyncGenerator<RefreshResult>;
  /** E64: narrows `itemIds` to the stale ones (E63), NULL-`lastRefreshedAt` first then oldest-first. */
  filterStaleItemIds(itemIds: number[], now?: string): number[];
  getCalendar(opts?: { from?: string; to?: string }): CalendarResponse;
  /** E27: newest-first watch log; `limit` is trusted as already-clamped 1-100 (the route validates). */
  getWatchHistory(limit: number): WatchHistoryEntry[];
  addPushSubscription(sub: PushSubscriptionRecord): void;
  removePushSubscription(endpoint: string): boolean;
  listPushSubscriptions(): PushSubscriptionRecord[];
  exportZip(opts?: ExportOptions): Archiver;
  importZip(zipBuffer: Buffer, mode: ImportMode): Promise<ImportResult>;
}

export function createLibrary(db: LibraryDatabase): Library {
  return {
    findItemIdByExternalIds(ids: ExternalIds): number | null {
      return findConflictingItemId(db, ids);
    },

    addSeries(details: SeriesDetails, opts: AddSeriesOptions = {}): SeriesSummary {
      const existingId = findConflictingItemId(db, details.externalIds);
      if (existingId != null) throw new AlreadyInLibraryError(existingId);

      const now = new Date().toISOString();

      const itemId = db.transaction((tx) => {
        const inserted = tx
          .insert(schema.items)
          .values(
            toItemInsertValues(
              details,
              now,
              opts.addedVia ?? "manual",
              opts.externalRatings ?? null,
              opts.watchProviders ?? null,
              opts.tags ?? null,
              opts.cast ?? null,
            ),
          )
          .returning({ id: schema.items.id })
          .get();

        const settings = getSettings(db);
        const defaultList = settings.newSeriesDefaultStatus === "watchlist" ? "watch_later" : null;

        tx.insert(schema.tracking)
          .values({
            itemId: inserted.id,
            manualList: opts.manualList ?? defaultList,
            pushMuted: false,
            note: null,
            listChangedAt: now,
            needsReview: opts.needsReview ?? false,
          })
          .run();

        for (const season of details.seasons) {
          tx.insert(schema.seasons)
            .values({
              itemId: inserted.id,
              number: season.number,
              name: season.name ?? null,
              overview: season.overview ?? null,
              posterRef: season.posterRef ?? null,
              airDate: season.airDate ?? null,
            })
            .run();

          for (const ep of season.episodes) {
            tx.insert(schema.episodes)
              .values({
                itemId: inserted.id,
                seasonNumber: ep.seasonNumber,
                episodeNumber: ep.episodeNumber,
                title: ep.title ?? null,
                overview: ep.overview ?? null,
                airDate: ep.airDate ?? null,
                runtimeMin: ep.runtimeMin ?? null,
                stillRef: ep.stillRef ?? null,
                episodeType: ep.episodeType ?? null,
                externalRatings: ep.externalRatings ?? null,
              })
              .run();
          }
        }

        return inserted.id;
      });

      const row = getItemAndTracking(db, itemId);
      if (!row) throw new Error("addSeries: item vanished after insert");
      const info = requireCategoryInfo(computeCategoryInfo(db, [itemId]), itemId);
      return buildSummary(db, row.item, row.tracking, info);
    },

    listSeries(opts: ListSeriesOptions = {}): { items: SeriesSummary[]; total: number } {
      const rows = db
        .select({ item: schema.items, tracking: schema.tracking })
        .from(schema.items)
        .innerJoin(schema.tracking, eq(schema.tracking.itemId, schema.items.id))
        .all();

      const categoryInfo = computeCategoryInfo(
        db,
        rows.map((r) => r.item.id),
      );

      let enriched = rows.map((row) => ({
        addedAt: row.item.addedAt,
        summary: buildSummary(
          db,
          row.item,
          row.tracking,
          requireCategoryInfo(categoryInfo, row.item.id),
        ),
      }));

      if (opts.category) {
        enriched = enriched.filter((e) => e.summary.category === opts.category);
      }

      sortEnriched(enriched, opts.sort ?? "added");

      return { items: enriched.map((e) => e.summary), total: enriched.length };
    },

    getSeries(id: number): SeriesDetail | null {
      const row = getItemAndTracking(db, id);
      if (!row) return null;
      const { item, tracking } = row;
      const info = requireCategoryInfo(computeCategoryInfo(db, [id]), id);

      const seasonRows = db
        .select()
        .from(schema.seasons)
        .where(eq(schema.seasons.itemId, id))
        .orderBy(schema.seasons.number)
        .all();
      const episodeRows = db
        .select()
        .from(schema.episodes)
        .where(eq(schema.episodes.itemId, id))
        .orderBy(schema.episodes.seasonNumber, schema.episodes.episodeNumber)
        .all();

      const watchStats = db
        .select({
          episodeId: schema.watches.episodeId,
          count: sql<number>`count(*)`,
          lastWatchedAt: sql<string>`max(${schema.watches.watchedAt})`,
        })
        .from(schema.watches)
        .where(eq(schema.watches.itemId, id))
        .groupBy(schema.watches.episodeId)
        .all();
      const watchStatsByEpisode = new Map(watchStats.map((w) => [w.episodeId, w]));

      const episodeRatingRows = db
        .select({ targetId: schema.ratings.targetId, value: schema.ratings.value })
        .from(schema.ratings)
        .innerJoin(
          schema.episodes,
          and(eq(schema.episodes.id, schema.ratings.targetId), eq(schema.episodes.itemId, id)),
        )
        .where(eq(schema.ratings.targetType, "episode"))
        .all();
      const ratingByEpisode = new Map(episodeRatingRows.map((r) => [r.targetId, r.value]));

      const episodesBySeason = new Map<number, EpisodeSummary[]>();
      for (const ep of episodeRows) {
        const list = episodesBySeason.get(ep.seasonNumber) ?? [];
        const stats = watchStatsByEpisode.get(ep.id);
        list.push({
          id: ep.id,
          s: ep.seasonNumber,
          e: ep.episodeNumber,
          title: ep.title,
          overview: ep.overview,
          airDate: ep.airDate,
          runtimeMin: ep.runtimeMin,
          stillRef: ep.stillRef,
          episodeType: ep.episodeType,
          communityRating: ep.externalRatings?.[0] ?? null,
          myRating: ratingByEpisode.get(ep.id) ?? null,
          watchCount: stats?.count ?? 0,
          lastWatchedAt: stats?.lastWatchedAt ?? null,
        });
        episodesBySeason.set(ep.seasonNumber, list);
      }

      const seasons: SeasonSummary[] = seasonRows.map((s) => ({
        number: s.number,
        name: s.name,
        overview: s.overview,
        posterRef: s.posterRef,
        airDate: s.airDate,
        episodes: episodesBySeason.get(s.number) ?? [],
      }));

      return {
        ...buildSummary(db, item, tracking, info),
        tagline: item.tagline,
        overview: item.overview,
        genres: item.genres ?? [],
        tags: item.tags ?? [],
        cast: item.cast ?? [],
        contentRatings: item.contentRatings ?? [],
        networks: item.networks ?? [],
        originCountry: item.originCountry ? item.originCountry.split(",") : [],
        originalLanguage: item.originalLanguage,
        episodeRunTimes: item.episodeRunTimes ?? [],
        watchProviders: item.watchProviders ?? [],
        externalRatings: item.externalRatings ?? [],
        backdropRef: item.backdropRef,
        logoRef: item.logoRef,
        note: tracking.note,
        lastRefreshedAt: item.lastRefreshedAt,
        addedAt: item.addedAt,
        seasons,
      };
    },

    removeSeries(id: number): boolean {
      const result = db.delete(schema.items).where(eq(schema.items.id, id)).run();
      return result.changes > 0;
    },

    /** Danger zone (Settings): irreversibly deletes every row in the library — items
     * (cascades tracking/seasons/episodes/watches), ratings, settings, push
     * subscriptions, the refresh log, and (WP4) the uploaded profile photo. The
     * caller (route) owns confirmation. */
    resetLibrary(): void {
      db.delete(schema.items).run();
      db.delete(schema.ratings).run();
      db.delete(schema.settings).run();
      db.delete(schema.pushSubscriptions).run();
      db.delete(schema.refreshLog).run();
      clearAvatar(db);
    },

    updateTracking(itemId: number, patch: TrackingPatch): SeriesSummary | null {
      const existing = getItemAndTracking(db, itemId);
      if (!existing) return null;

      if (patch.manualList === "stopped" && computeDynamicCategory(db, itemId) === "finished") {
        throw new ManualListConflictError(itemId);
      }

      const dbPatch: Partial<typeof schema.tracking.$inferInsert> = {};
      if (patch.manualList !== undefined) {
        dbPatch.manualList = patch.manualList;
        dbPatch.listChangedAt = new Date().toISOString();
      }
      if (patch.pushMuted !== undefined) dbPatch.pushMuted = patch.pushMuted;
      if (patch.note !== undefined) dbPatch.note = patch.note;
      if (patch.favorite !== undefined) dbPatch.favorite = patch.favorite;
      if (patch.needsReview !== undefined) dbPatch.needsReview = patch.needsReview;

      if (Object.keys(dbPatch).length > 0) {
        db.update(schema.tracking).set(dbPatch).where(eq(schema.tracking.itemId, itemId)).run();
      }

      const row = getItemAndTracking(db, itemId);
      if (!row) return null;
      const info = requireCategoryInfo(computeCategoryInfo(db, [itemId]), itemId);
      return buildSummary(db, row.item, row.tracking, info);
    },

    clearStaleStoppedLists(): void {
      const stopped = db
        .select({ itemId: schema.tracking.itemId })
        .from(schema.tracking)
        .where(eq(schema.tracking.manualList, "stopped"))
        .all();
      if (stopped.length === 0) return;

      const itemIds = stopped.map((row) => row.itemId);
      const categories = computeDynamicCategories(db, itemIds);
      const toClear = itemIds.filter((id) => categories.get(id) === "finished");
      if (toClear.length === 0) return;

      db.update(schema.tracking)
        .set({ manualList: null, listChangedAt: new Date().toISOString() })
        .where(inArray(schema.tracking.itemId, toClear))
        .run();
    },

    addWatch(
      episodeId: number,
      watchedAt?: string,
      source?: WatchSource,
      opts?: { dateUnknown?: boolean },
    ): AddWatchResult | null {
      return addWatch(db, episodeId, watchedAt, source, opts);
    },

    bulkWatch(itemId: number, target: BulkWatchTarget): BulkWatchResult | null {
      return bulkWatch(db, itemId, target);
    },
    bulkUnwatch(itemId: number, target: BulkWatchTarget): BulkUnwatchResult | null {
      return bulkUnwatch(db, itemId, target);
    },

    removeLatestWatch(episodeId: number): boolean {
      return removeLatestWatch(db, episodeId);
    },

    setRating(targetType: RatingTargetType, targetId: number, value: 1 | 2 | 3): Rating {
      return setRating(db, targetType, targetId, value);
    },

    clearRating(targetType: RatingTargetType, targetId: number): boolean {
      return clearRating(db, targetType, targetId);
    },

    getStats(tz?: string): Stats {
      return getStats(db, tz);
    },

    getSettings(): Settings {
      return getSettings(db);
    },

    updateSettings(patch: SettingsPatch): Settings {
      return updateSettings(db, patch);
    },

    getTmdbApiKey(): string | undefined {
      return getTmdbApiKey(db);
    },

    setAvatar(mimeType: string, data: Buffer): Settings {
      setAvatar(db, mimeType, data, new Date().toISOString());
      return getSettings(db);
    },

    getAvatar(): AvatarData | undefined {
      return getAvatar(db);
    },

    refreshItem(provider: MetadataProvider, itemId: number): Promise<RefreshResult> {
      return refreshItem(db, provider, itemId);
    },

    refreshAll(
      provider: MetadataProvider,
      itemIds: number[],
      concurrency?: number,
      opts?: RefreshAllOptions,
    ): AsyncGenerator<RefreshResult> {
      return refreshAll(db, provider, itemIds, concurrency, opts);
    },

    filterStaleItemIds(itemIds: number[], now?: string): number[] {
      return filterStaleItemIds(db, itemIds, now);
    },

    getCalendar(opts?: { from?: string; to?: string }): CalendarResponse {
      return getCalendar(db, opts);
    },

    getWatchHistory(limit: number): WatchHistoryEntry[] {
      return getWatchHistory(db, limit);
    },

    addPushSubscription(sub: PushSubscriptionRecord): void {
      addPushSubscription(db, sub);
    },

    removePushSubscription(endpoint: string): boolean {
      return removePushSubscription(db, endpoint);
    },

    listPushSubscriptions(): PushSubscriptionRecord[] {
      return listPushSubscriptions(db);
    },

    exportZip(opts?: ExportOptions): Archiver {
      return exportLibraryZip(db, opts);
    },

    importZip(zipBuffer: Buffer, mode: ImportMode): Promise<ImportResult> {
      return importLibraryZip(db, zipBuffer, mode);
    },
  };
}
