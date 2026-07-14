import { eq, sql } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import type { TrackingStatus } from "../db/schema.ts";
import * as schema from "../db/schema.ts";

export interface Stats {
  episodesWatched: number;
  watchTimeMin: number;
  itemCount: Record<TrackingStatus, number>;
  episodesPerMonth: { month: string; count: number }[];
  ratingDistribution: Record<"1" | "2" | "3", number>;
}

const ALL_STATUSES: TrackingStatus[] = [
  "watching",
  "plan_to_watch",
  "completed",
  "dropped",
  "paused",
];

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

  const itemCount = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<
    TrackingStatus,
    number
  >;
  const trackingRows = db
    .select({ status: schema.tracking.status, count: sql<number>`count(*)` })
    .from(schema.tracking)
    .groupBy(schema.tracking.status)
    .all();
  for (const row of trackingRows) itemCount[row.status] = row.count;

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

  return {
    episodesWatched,
    watchTimeMin: Math.round(watchTimeMin),
    itemCount,
    episodesPerMonth,
    ratingDistribution,
  };
}
