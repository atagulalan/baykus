import type { ReleaseStatus } from "@baykus/provider-sdk";
import { and, eq, inArray, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";
import type { LibraryDatabase } from "../../db/open.ts";
import * as schema from "../../db/schema.ts";
import type { WatchCategory } from "../category.ts";
import { CATEGORY_ORDER, computeCategories, ONGOING_RELEASE_STATUSES } from "../category.ts";
import { todayUtc } from "../progress.ts";

export interface RewatchedEpisode {
  itemId: number;
  itemTitle: string;
  episodeId: number;
  s: number;
  e: number;
  episodeTitle: string | null;
  watchCount: number;
}

export interface NamedCount {
  name: string;
  episodes: number;
}

export interface SeriesEpisodeProgress {
  itemId: number;
  title: string;
  watchedEpisodes: number;
  airedEpisodes: number;
}

export interface Totals {
  episodesWatched: number;
  watchTimeMin: number;
  itemCount: Record<WatchCategory, number>;
  episodesPerMonth: { month: string; count: number }[];
  ratingDistribution: Record<"1" | "2" | "3", number>;
  mostRewatched: RewatchedEpisode[];

  seriesCount: number;
  favoritesCount: number;
  datedWatches: { dated: number; total: number };
  mostWatchedByTime: { itemId: number; title: string; watchTimeMin: number }[];
  favoriteProgress: SeriesEpisodeProgress[];
  production: {
    ongoing: number;
    ended: number;
    ongoingItems: SeriesEpisodeProgress[];
  };
  genreDistribution: { top: NamedCount[]; other: number };
  networkDistribution: { networkCount: number; top: NamedCount[]; other: number };
  backlog: {
    episodes: number;
    seriesCount: number;
    watchTimeMin: number;
    topSeries: { itemId: number; title: string; episodes: number }[];
  };
  rewatchSummary: {
    totalRewatches: number;
    rewatchedEpisodes: number;
    bySeries: { itemId: number; title: string; rewatches: number }[];
  };
}

/** E13: unknown per-episode runtime falls back to the item's avg episodeRunTimes, else 0. */
function episodeRuntimeMin(row: {
  runtimeMin: number | null;
  itemRunTimes: number[] | null;
}): number {
  if (row.runtimeMin != null) return row.runtimeMin;
  const times = row.itemRunTimes ?? [];
  return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
}

/** Top-N by count desc, ties broken by name/title asc for determinism. */
function topByCount<T extends { name?: string; title?: string }>(
  entries: T[],
  count: (t: T) => number,
  limit: number,
): T[] {
  return [...entries]
    .sort((a, b) => {
      const diff = count(b) - count(a);
      if (diff !== 0) return diff;
      const an = a.name ?? a.title ?? "";
      const bn = b.name ?? b.title ?? "";
      return an < bn ? -1 : an > bn ? 1 : 0;
    })
    .slice(0, limit);
}

function computeHeroAndLegacy(db: LibraryDatabase) {
  const episodesWatchedRow = db
    .select({ count: sql<number>`count(distinct ${schema.watches.episodeId})` })
    .from(schema.watches)
    .get();
  const episodesWatched = episodesWatchedRow?.count ?? 0;

  const watchRows = db
    .select({
      itemId: schema.watches.itemId,
      title: schema.items.title,
      runtimeMin: schema.episodes.runtimeMin,
      itemRunTimes: schema.items.episodeRunTimes,
    })
    .from(schema.watches)
    .innerJoin(schema.episodes, eq(schema.watches.episodeId, schema.episodes.id))
    .innerJoin(schema.items, eq(schema.episodes.itemId, schema.items.id))
    .all();

  let watchTimeMin = 0;
  const minByItem = new Map<number, { title: string; min: number }>();
  for (const row of watchRows) {
    const min = episodeRuntimeMin(row);
    watchTimeMin += min;
    const entry = minByItem.get(row.itemId);
    if (entry) entry.min += min;
    else minByItem.set(row.itemId, { title: row.title, min });
  }
  const mostWatchedByTime = topByCount(
    [...minByItem.entries()].map(([itemId, v]) => ({
      itemId,
      title: v.title,
      watchTimeMin: v.min,
    })),
    (t) => t.watchTimeMin,
    12,
  );

  const monthExpr = sql<string>`substr(${schema.watches.watchedAt}, 1, 7)`;
  const monthRows = db
    .select({ month: monthExpr, count: sql<number>`count(*)` })
    .from(schema.watches)
    .groupBy(monthExpr)
    .all();
  const episodesPerMonth = monthRows
    .map((r) => ({ month: r.month, count: r.count }))
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));

  const ratingDistribution: Record<"1" | "2" | "3", number> = { "1": 0, "2": 0, "3": 0 };
  const ratingRows = db
    .select({ value: schema.ratings.value, count: sql<number>`count(*)` })
    .from(schema.ratings)
    .groupBy(schema.ratings.value)
    .all();
  for (const row of ratingRows) {
    const key = String(row.value) as "1" | "2" | "3";
    if (key in ratingDistribution) ratingDistribution[key] = row.count;
  }

  const rewatchRows = db
    .select({
      itemId: schema.items.id,
      itemTitle: schema.items.title,
      episodeId: schema.episodes.id,
      s: schema.episodes.seasonNumber,
      e: schema.episodes.episodeNumber,
      episodeTitle: schema.episodes.title,
      watchCount: sql<number>`count(*)`,
    })
    .from(schema.watches)
    .innerJoin(schema.episodes, eq(schema.watches.episodeId, schema.episodes.id))
    .innerJoin(schema.items, eq(schema.episodes.itemId, schema.items.id))
    .groupBy(
      schema.items.id,
      schema.items.title,
      schema.episodes.id,
      schema.episodes.seasonNumber,
      schema.episodes.episodeNumber,
      schema.episodes.title,
    )
    .having(sql`count(*) > 1`)
    .orderBy(sql`count(*) desc`, schema.items.title)
    .limit(10)
    .all();

  const mostRewatched: RewatchedEpisode[] = rewatchRows.map((row) => ({
    itemId: row.itemId,
    itemTitle: row.itemTitle,
    episodeId: row.episodeId,
    s: row.s,
    e: row.e,
    episodeTitle: row.episodeTitle,
    watchCount: row.watchCount,
  }));

  return {
    episodesWatched,
    watchTimeMin: Math.round(watchTimeMin),
    episodesPerMonth,
    ratingDistribution,
    mostRewatched,
    mostWatchedByTime,
  };
}

function computeItemCount(
  categories: ReadonlyMap<number, WatchCategory>,
): Record<WatchCategory, number> {
  const itemCount = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])) as Record<
    WatchCategory,
    number
  >;
  for (const category of categories.values()) itemCount[category]++;
  return itemCount;
}

function computeDatedWatches(db: LibraryDatabase): { dated: number; total: number } {
  const row = db
    .select({
      total: sql<number>`count(*)`,
      dated: sql<number>`sum(case when ${schema.watches.dateUnknown} = 0 then 1 else 0 end)`,
    })
    .from(schema.watches)
    .get();
  return { dated: row?.dated ?? 0, total: row?.total ?? 0 };
}

/** Non-special (season > 0) watched/aired episode counts per item — shared by favorites and production. */
function computeSeriesEpisodeProgress(
  db: LibraryDatabase,
  itemIds: number[],
): Map<number, { watchedEpisodes: number; airedEpisodes: number }> {
  const result = new Map<number, { watchedEpisodes: number; airedEpisodes: number }>();
  if (itemIds.length === 0) return result;

  const today = todayUtc();
  const nonSpecial = ne(schema.episodes.seasonNumber, 0);
  const aired = and(isNotNull(schema.episodes.airDate), lte(schema.episodes.airDate, today));

  const airedAgg = db
    .select({ itemId: schema.episodes.itemId, count: sql<number>`count(*)` })
    .from(schema.episodes)
    .where(and(inArray(schema.episodes.itemId, itemIds), nonSpecial, aired))
    .groupBy(schema.episodes.itemId)
    .all();

  const watchedAgg = db
    .select({
      itemId: schema.episodes.itemId,
      count: sql<number>`count(distinct ${schema.episodes.id})`,
    })
    .from(schema.episodes)
    .innerJoin(schema.watches, eq(schema.watches.episodeId, schema.episodes.id))
    .where(and(inArray(schema.episodes.itemId, itemIds), nonSpecial, aired))
    .groupBy(schema.episodes.itemId)
    .all();
  const watchedByItem = new Map(watchedAgg.map((r) => [r.itemId, r.count]));

  for (const row of airedAgg) {
    result.set(row.itemId, {
      airedEpisodes: row.count,
      watchedEpisodes: watchedByItem.get(row.itemId) ?? 0,
    });
  }
  return result;
}

function computeFavoriteProgress(db: LibraryDatabase): SeriesEpisodeProgress[] {
  const favorites = db
    .select({ itemId: schema.tracking.itemId, title: schema.items.title })
    .from(schema.tracking)
    .innerJoin(schema.items, eq(schema.items.id, schema.tracking.itemId))
    .where(eq(schema.tracking.favorite, true))
    .all();
  const progress = computeSeriesEpisodeProgress(
    db,
    favorites.map((f) => f.itemId),
  );

  return favorites
    .map((f) => ({
      itemId: f.itemId,
      title: f.title,
      watchedEpisodes: progress.get(f.itemId)?.watchedEpisodes ?? 0,
      airedEpisodes: progress.get(f.itemId)?.airedEpisodes ?? 0,
    }))
    .sort((a, b) => b.watchedEpisodes - a.watchedEpisodes || (a.title < b.title ? -1 : 1));
}

function computeProduction(
  db: LibraryDatabase,
  allItems: { id: number; title: string; releaseStatus: ReleaseStatus | null }[],
): Totals["production"] {
  const ongoingRows = allItems.filter(
    (i) => i.releaseStatus !== null && ONGOING_RELEASE_STATUSES.has(i.releaseStatus),
  );
  const progress = computeSeriesEpisodeProgress(
    db,
    ongoingRows.map((i) => i.id),
  );
  const ongoingItems = ongoingRows
    .map((i) => ({
      itemId: i.id,
      title: i.title,
      watchedEpisodes: progress.get(i.id)?.watchedEpisodes ?? 0,
      airedEpisodes: progress.get(i.id)?.airedEpisodes ?? 0,
    }))
    .sort((a, b) => (a.title < b.title ? -1 : a.title > b.title ? 1 : 0));

  return {
    ongoing: ongoingRows.length,
    ended: allItems.length - ongoingRows.length,
    ongoingItems,
  };
}

/** Distinct watched episodes per item (all watches, specials included) — E98's attribution base. */
function watchedEpisodeCountByItem(db: LibraryDatabase): Map<number, number> {
  const rows = db
    .select({
      itemId: schema.watches.itemId,
      count: sql<number>`count(distinct ${schema.watches.episodeId})`,
    })
    .from(schema.watches)
    .groupBy(schema.watches.itemId)
    .all();
  return new Map(rows.map((r) => [r.itemId, r.count]));
}

function computeGenreDistribution(
  allItems: { id: number; genres: { name: string }[] | null }[],
  watchedByItem: Map<number, number>,
): { top: NamedCount[]; other: number } {
  const counts = new Map<string, number>();
  let other = 0;
  for (const item of allItems) {
    const watched = watchedByItem.get(item.id) ?? 0;
    if (watched === 0) continue;
    const genres = item.genres ?? [];
    if (genres.length === 0) {
      other += watched;
      continue;
    }
    for (const genre of genres) counts.set(genre.name, (counts.get(genre.name) ?? 0) + watched);
  }
  const sorted = topByCount(
    [...counts.entries()].map(([name, episodes]) => ({ name, episodes })),
    (t) => t.episodes,
    8,
  );
  const topNames = new Set(sorted.map((s) => s.name));
  for (const [name, episodes] of counts) if (!topNames.has(name)) other += episodes;
  return { top: sorted, other };
}

function computeNetworkDistribution(
  allItems: { id: number; networks: { name: string }[] | null }[],
  watchedByItem: Map<number, number>,
): { networkCount: number; top: NamedCount[]; other: number } {
  const counts = new Map<string, number>();
  const allPrimaryNetworks = new Set<string>();
  let other = 0;
  for (const item of allItems) {
    const primary = item.networks?.[0]?.name;
    if (primary) allPrimaryNetworks.add(primary);

    const watched = watchedByItem.get(item.id) ?? 0;
    if (watched === 0) continue;
    if (!primary) {
      other += watched;
      continue;
    }
    counts.set(primary, (counts.get(primary) ?? 0) + watched);
  }
  const sorted = topByCount(
    [...counts.entries()].map(([name, episodes]) => ({ name, episodes })),
    (t) => t.episodes,
    8,
  );
  const topNames = new Set(sorted.map((s) => s.name));
  for (const [name, episodes] of counts) if (!topNames.has(name)) other += episodes;
  return { networkCount: allPrimaryNetworks.size, top: sorted, other };
}

/** E22 active trio — up_to_date items contribute 0 backlog episodes by definition. */
const ACTIVE_TRIO: ReadonlySet<WatchCategory> = new Set([
  "watching",
  "not_watched_recently",
  "up_to_date",
]);

function computeBacklog(
  db: LibraryDatabase,
  itemIds: number[],
  categories: ReadonlyMap<number, WatchCategory>,
): Totals["backlog"] {
  const trioItemIds = itemIds.filter((id) => {
    const category = categories.get(id);
    return category !== undefined && ACTIVE_TRIO.has(category);
  });
  if (trioItemIds.length === 0) {
    return { episodes: 0, seriesCount: 0, watchTimeMin: 0, topSeries: [] };
  }

  const today = todayUtc();
  const remainingRows = db
    .select({
      itemId: schema.episodes.itemId,
      title: schema.items.title,
      runtimeMin: schema.episodes.runtimeMin,
      itemRunTimes: schema.items.episodeRunTimes,
    })
    .from(schema.episodes)
    .innerJoin(schema.items, eq(schema.items.id, schema.episodes.itemId))
    .leftJoin(schema.watches, eq(schema.watches.episodeId, schema.episodes.id))
    .where(
      and(
        inArray(schema.episodes.itemId, trioItemIds),
        ne(schema.episodes.seasonNumber, 0),
        isNotNull(schema.episodes.airDate),
        lte(schema.episodes.airDate, today),
        isNull(schema.watches.id),
      ),
    )
    .all();

  const byItem = new Map<number, { title: string; episodes: number; min: number }>();
  let watchTimeMin = 0;
  for (const row of remainingRows) {
    const min = episodeRuntimeMin(row);
    watchTimeMin += min;
    const entry = byItem.get(row.itemId);
    if (entry) {
      entry.episodes++;
      entry.min += min;
    } else {
      byItem.set(row.itemId, { title: row.title, episodes: 1, min });
    }
  }

  const topSeries = topByCount(
    [...byItem.entries()].map(([itemId, v]) => ({ itemId, title: v.title, episodes: v.episodes })),
    (t) => t.episodes,
    10,
  );

  return {
    episodes: remainingRows.length,
    seriesCount: byItem.size,
    watchTimeMin: Math.round(watchTimeMin),
    topSeries,
  };
}

function computeRewatchSummary(db: LibraryDatabase): Totals["rewatchSummary"] {
  const rows = db
    .select({
      itemId: schema.items.id,
      itemTitle: schema.items.title,
      watchCount: sql<number>`count(*)`,
    })
    .from(schema.watches)
    .innerJoin(schema.episodes, eq(schema.watches.episodeId, schema.episodes.id))
    .innerJoin(schema.items, eq(schema.episodes.itemId, schema.items.id))
    .groupBy(schema.episodes.id, schema.items.id, schema.items.title)
    .having(sql`count(*) > 1`)
    .all();

  let totalRewatches = 0;
  const bySeriesMap = new Map<number, { title: string; rewatches: number }>();
  for (const row of rows) {
    const extra = row.watchCount - 1;
    totalRewatches += extra;
    const entry = bySeriesMap.get(row.itemId);
    if (entry) entry.rewatches += extra;
    else bySeriesMap.set(row.itemId, { title: row.itemTitle, rewatches: extra });
  }

  const bySeries = topByCount(
    [...bySeriesMap.entries()].map(([itemId, v]) => ({
      itemId,
      title: v.title,
      rewatches: v.rewatches,
    })),
    (t) => t.rewatches,
    10,
  );

  return { totalRewatches, rewatchedEpisodes: rows.length, bySeries };
}

export function computeTotals(db: LibraryDatabase): Totals {
  const allItems = db
    .select({
      id: schema.items.id,
      title: schema.items.title,
      releaseStatus: schema.items.releaseStatus,
      genres: schema.items.genres,
      networks: schema.items.networks,
    })
    .from(schema.items)
    .all();
  const itemIds = allItems.map((i) => i.id);
  const categories = computeCategories(db, itemIds);

  const legacy = computeHeroAndLegacy(db);
  const watchedByItem = watchedEpisodeCountByItem(db);

  return {
    ...legacy,
    itemCount: computeItemCount(categories),
    seriesCount: allItems.length,
    favoritesCount:
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.tracking)
        .where(eq(schema.tracking.favorite, true))
        .get()?.count ?? 0,
    datedWatches: computeDatedWatches(db),
    favoriteProgress: computeFavoriteProgress(db),
    production: computeProduction(db, allItems),
    genreDistribution: computeGenreDistribution(allItems, watchedByItem),
    networkDistribution: computeNetworkDistribution(allItems, watchedByItem),
    backlog: computeBacklog(db, itemIds, categories),
    rewatchSummary: computeRewatchSummary(db),
  };
}
