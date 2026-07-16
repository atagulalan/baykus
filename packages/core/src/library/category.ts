import type { ReleaseStatus } from "@baykus/provider-sdk";
import { and, eq, inArray, isNotNull, lte, ne, sql } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import type { AddedVia, ManualList } from "../db/schema.ts";
import * as schema from "../db/schema.ts";
import { getSettings } from "./settings.ts";

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

/** Default when the settings table has no `watching_window_days` row yet — see settings.ts. */
export const DEFAULT_WATCHING_WINDOW_DAYS = 30;

/** E18: only these count as "more episodes coming"; everything else (incl. NULL) is the finished branch. */
const ONGOING_RELEASE_STATUSES: ReadonlySet<ReleaseStatus> = new Set([
  "returning",
  "in_production",
]);

interface ItemCategoryInputs {
  manualList: ManualList | null;
  watchedEpisodes: number;
  lastWatchedAt: string | null;
  airedEpisodes: number;
  airedUnwatched: number;
  releaseStatus: ReleaseStatus | null;
  /** Max air_date over non-special aired episodes, or null if none aired yet (E33). */
  newestAiredAt: string | null;
  addedAt: string;
  addedVia: AddedVia;
  needsReview: boolean;
}

/** ISO datetime string, no milliseconds, matching how watched_at/list_changed_at are stored. */
function isoNow(now: Date): string {
  return now.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function windowStart(now: Date, windowDays: number): string {
  return isoNow(new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000));
}

/** E30 precedence, applied to one item's already-fetched aggregates. */
function categorize(
  inputs: ItemCategoryInputs,
  now: Date,
  opts: { ignoreManualList: boolean },
  windowDays: number,
): WatchCategory {
  if (inputs.needsReview) return "needs_review";

  if (!opts.ignoreManualList) {
    if (inputs.manualList === "watch_later") return "watch_later";
    if (inputs.manualList === "stopped") return "stopped";
  }

  const windowStartIso = windowStart(now, windowDays);

  if (inputs.watchedEpisodes === 0) {
    // Rung 3: the newly-added lift never reaches a zero-watch item via the
    // new-episode operand below — only a fresh manual add lifts it (E32/E33).
    if (inputs.addedVia === "manual" && inputs.addedAt >= windowStartIso) return "watching";
    return "not_started";
  }

  if (inputs.airedEpisodes > 0 && inputs.airedUnwatched === 0) {
    return inputs.releaseStatus && ONGOING_RELEASE_STATUSES.has(inputs.releaseStatus)
      ? "up_to_date"
      : "finished";
  }

  const watchedRecently = inputs.lastWatchedAt !== null && inputs.lastWatchedAt >= windowStartIso;
  const newEpisodeAired =
    inputs.newestAiredAt !== null && inputs.newestAiredAt >= windowStartIso.slice(0, 10);
  if (watchedRecently || newEpisodeAired) return "watching";
  return "not_watched_recently";
}

export interface CategoryInfo {
  category: WatchCategory;
  /** Max watched_at over non-special watches, or null if never watched. */
  lastWatchedAt: string | null;
}

function computeCategoriesInternal(
  db: LibraryDatabase,
  itemIds: number[],
  now: Date,
  opts: { ignoreManualList: boolean },
): Map<number, CategoryInfo> {
  const result = new Map<number, CategoryInfo>();
  if (itemIds.length === 0) return result;

  // Read once per batch, never per item (plan.md §Risks 5).
  const windowDays = getSettings(db).watchingWindowDays;

  const today = isoNow(now).slice(0, 10);
  const nonSpecial = ne(schema.episodes.seasonNumber, 0);
  const aired = and(isNotNull(schema.episodes.airDate), lte(schema.episodes.airDate, today));

  const base = db
    .select({
      id: schema.items.id,
      releaseStatus: schema.items.releaseStatus,
      manualList: schema.tracking.manualList,
      needsReview: schema.tracking.needsReview,
      addedAt: schema.items.addedAt,
      addedVia: schema.items.addedVia,
    })
    .from(schema.items)
    .innerJoin(schema.tracking, eq(schema.tracking.itemId, schema.items.id))
    .where(inArray(schema.items.id, itemIds))
    .all();

  const watchAgg = db
    .select({
      itemId: schema.watches.itemId,
      watchedEpisodes: sql<number>`count(distinct ${schema.watches.episodeId})`,
      lastWatchedAt: sql<string>`max(${schema.watches.watchedAt})`,
    })
    .from(schema.watches)
    .innerJoin(schema.episodes, eq(schema.watches.episodeId, schema.episodes.id))
    .where(and(inArray(schema.watches.itemId, itemIds), nonSpecial))
    .groupBy(schema.watches.itemId)
    .all();
  const watchByItem = new Map(watchAgg.map((r) => [r.itemId, r]));

  // Same WHERE/GROUP BY as the old airedEpisodes-only aggregate — newestAiredAt
  // (E33) rides along for free instead of costing a second grouped query.
  const airedAgg = db
    .select({
      itemId: schema.episodes.itemId,
      airedEpisodes: sql<number>`count(*)`,
      newestAiredAt: sql<string | null>`max(${schema.episodes.airDate})`,
    })
    .from(schema.episodes)
    .where(and(inArray(schema.episodes.itemId, itemIds), nonSpecial, aired))
    .groupBy(schema.episodes.itemId)
    .all();
  const airedByItem = new Map(airedAgg.map((r) => [r.itemId, r]));

  const airedWatchedAgg = db
    .select({
      itemId: schema.episodes.itemId,
      airedWatched: sql<number>`count(distinct ${schema.episodes.id})`,
    })
    .from(schema.episodes)
    .innerJoin(schema.watches, eq(schema.watches.episodeId, schema.episodes.id))
    .where(and(inArray(schema.episodes.itemId, itemIds), nonSpecial, aired))
    .groupBy(schema.episodes.itemId)
    .all();
  const airedWatchedByItem = new Map(airedWatchedAgg.map((r) => [r.itemId, r.airedWatched]));

  for (const row of base) {
    const watch = watchByItem.get(row.id);
    const airedRow = airedByItem.get(row.id);
    const airedEpisodes = airedRow?.airedEpisodes ?? 0;
    const airedWatched = airedWatchedByItem.get(row.id) ?? 0;

    const lastWatchedAt = watch?.lastWatchedAt ?? null;
    result.set(row.id, {
      category: categorize(
        {
          manualList: row.manualList,
          watchedEpisodes: watch?.watchedEpisodes ?? 0,
          lastWatchedAt,
          airedEpisodes,
          airedUnwatched: airedEpisodes - airedWatched,
          releaseStatus: row.releaseStatus,
          newestAiredAt: airedRow?.newestAiredAt ?? null,
          addedAt: row.addedAt,
          addedVia: row.addedVia,
          needsReview: row.needsReview,
        },
        now,
        opts,
        windowDays,
      ),
      lastWatchedAt,
    });
  }

  return result;
}

function categoriesOnly(info: Map<number, CategoryInfo>): Map<number, WatchCategory> {
  const out = new Map<number, WatchCategory>();
  for (const [id, v] of info) out.set(id, v.category);
  return out;
}

/** Batch: one grouped query per aggregate, merged in JS — never call per-item in a loop. */
export function computeCategories(
  db: LibraryDatabase,
  itemIds: number[],
  now: Date = new Date(),
): Map<number, WatchCategory> {
  return categoriesOnly(computeCategoriesInternal(db, itemIds, now, { ignoreManualList: false }));
}

export function computeCategory(
  db: LibraryDatabase,
  itemId: number,
  now: Date = new Date(),
): WatchCategory | null {
  return computeCategories(db, [itemId], now).get(itemId) ?? null;
}

/** Same as computeCategories but as if manual_list were NULL — E20 guard, E26 cleanup. */
export function computeDynamicCategories(
  db: LibraryDatabase,
  itemIds: number[],
  now: Date = new Date(),
): Map<number, WatchCategory> {
  return categoriesOnly(computeCategoriesInternal(db, itemIds, now, { ignoreManualList: true }));
}

export function computeDynamicCategory(
  db: LibraryDatabase,
  itemId: number,
  now: Date = new Date(),
): WatchCategory | null {
  return computeDynamicCategories(db, [itemId], now).get(itemId) ?? null;
}

/**
 * Batch category + lastWatchedAt together, reusing the same watch aggregate —
 * SeriesSummary needs both and must not run a second per-item query for the latter.
 */
export function computeCategoryInfo(
  db: LibraryDatabase,
  itemIds: number[],
  now: Date = new Date(),
): Map<number, CategoryInfo> {
  return computeCategoriesInternal(db, itemIds, now, { ignoreManualList: false });
}
