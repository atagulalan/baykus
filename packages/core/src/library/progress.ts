import { and, eq, ne, sql } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import * as schema from "../db/schema.ts";

/** E3: "aired" = airDate <= today's UTC date, plain-date comparison. */
export function todayUtc(): string {
  const iso = new Date().toISOString();
  return iso.slice(0, 10);
}

export interface SeriesProgress {
  watched: number;
  aired: number;
  total: number;
}

export interface NextUnwatchedEpisode {
  episodeId: number;
  s: number;
  e: number;
  title: string | null;
}

/** E1/E4: progress excludes season 0 (specials); denominator is aired, not announced. */
export function getSeriesProgress(db: LibraryDatabase, itemId: number): SeriesProgress {
  const today = todayUtc();

  const episodes = db
    .select({ id: schema.episodes.id, airDate: schema.episodes.airDate })
    .from(schema.episodes)
    .where(and(eq(schema.episodes.itemId, itemId), ne(schema.episodes.seasonNumber, 0)))
    .all();

  const total = episodes.length;
  if (total === 0) return { watched: 0, aired: 0, total: 0 };

  const aired = episodes.filter((e) => e.airDate !== null && e.airDate <= today).length;

  const watchedRows = db
    .select({ episodeId: schema.watches.episodeId })
    .from(schema.watches)
    .innerJoin(schema.episodes, eq(schema.watches.episodeId, schema.episodes.id))
    .where(and(eq(schema.episodes.itemId, itemId), ne(schema.episodes.seasonNumber, 0)))
    .groupBy(schema.watches.episodeId)
    .all();

  return { watched: watchedRows.length, aired, total };
}

/** First non-special episode (airing order) with no watch event, regardless of airedness. */
export function getNextUnwatchedEpisode(
  db: LibraryDatabase,
  itemId: number,
): NextUnwatchedEpisode | null {
  const row = db
    .select({
      id: schema.episodes.id,
      s: schema.episodes.seasonNumber,
      e: schema.episodes.episodeNumber,
      title: schema.episodes.title,
    })
    .from(schema.episodes)
    .leftJoin(schema.watches, eq(schema.watches.episodeId, schema.episodes.id))
    .where(
      and(
        eq(schema.episodes.itemId, itemId),
        ne(schema.episodes.seasonNumber, 0),
        sql`${schema.watches.id} IS NULL`,
      ),
    )
    .orderBy(schema.episodes.seasonNumber, schema.episodes.episodeNumber)
    .limit(1)
    .get();

  if (!row) return null;
  return { episodeId: row.id, s: row.s, e: row.e, title: row.title };
}

/** Earliest strictly-future non-special air date, or null if none scheduled. */
export function getNextAirDate(db: LibraryDatabase, itemId: number): string | null {
  const today = todayUtc();
  const row = db
    .select({ airDate: schema.episodes.airDate })
    .from(schema.episodes)
    .where(
      and(
        eq(schema.episodes.itemId, itemId),
        ne(schema.episodes.seasonNumber, 0),
        sql`${schema.episodes.airDate} > ${today}`,
      ),
    )
    .orderBy(schema.episodes.airDate)
    .limit(1)
    .get();
  return row?.airDate ?? null;
}
