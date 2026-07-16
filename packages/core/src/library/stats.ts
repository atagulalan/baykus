import { eq, sql } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import * as schema from "../db/schema.ts";
import { CATEGORY_ORDER, computeCategories, type WatchCategory } from "./category.ts";

export interface RewatchedEpisode {
  itemId: number;
  itemTitle: string;
  episodeId: number;
  s: number;
  e: number;
  episodeTitle: string | null;
  watchCount: number;
}

export interface Stats {
  episodesWatched: number;
  watchTimeMin: number;
  itemCount: Record<WatchCategory, number>;
  episodesPerMonth: { month: string; count: number }[];
  ratingDistribution: Record<"1" | "2" | "3", number>;
  mostRewatched: RewatchedEpisode[];
}

/** contracts/api.md §stats. watchTimeMin: E13 — unknown per-episode runtime falls back to the item's avg episodeRunTimes, else 0. */
export function getStats(db: LibraryDatabase): Stats {
  const episodesWatchedRow = db
    .select({ count: sql<number>`count(distinct ${schema.watches.episodeId})` })
    .from(schema.watches)
    .get();
  const episodesWatched = episodesWatchedRow?.count ?? 0;

  const watchRows = db
    .select({
      runtimeMin: schema.episodes.runtimeMin,
      itemRunTimes: schema.items.episodeRunTimes,
    })
    .from(schema.watches)
    .innerJoin(schema.episodes, eq(schema.watches.episodeId, schema.episodes.id))
    .innerJoin(schema.items, eq(schema.episodes.itemId, schema.items.id))
    .all();

  let watchTimeMin = 0;
  for (const row of watchRows) {
    if (row.runtimeMin != null) {
      watchTimeMin += row.runtimeMin;
      continue;
    }
    const times = row.itemRunTimes ?? [];
    if (times.length > 0) {
      watchTimeMin += times.reduce((a, b) => a + b, 0) / times.length;
    }
  }

  const itemCount = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])) as Record<
    WatchCategory,
    number
  >;
  const itemIds = db
    .select({ id: schema.items.id })
    .from(schema.items)
    .all()
    .map((row) => row.id);
  for (const category of computeCategories(db, itemIds).values()) itemCount[category]++;

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
    itemCount,
    episodesPerMonth,
    ratingDistribution,
    mostRewatched,
  };
}
