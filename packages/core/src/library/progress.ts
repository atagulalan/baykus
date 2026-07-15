import type { EpisodeType } from "@baykus/provider-sdk";
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

export interface SeasonProgressEntry {
  number: number;
  watched: number;
  total: number;
}

export interface SeasonProgress {
  seasons: SeasonProgressEntry[];
  sequential: boolean;
}

export interface NextUnwatchedEpisode {
  episodeId: number;
  s: number;
  e: number;
  title: string | null;
  airDate: string | null;
  episodeType: EpisodeType | null;
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

/**
 * E34: per-season watched/total (total = announced, not just aired) plus
 * `sequential` — whether the watched set is a contiguous (s,e)-ordered
 * prefix. One episode query + one grouped watch query, then a single JS
 * scan; never per-episode.
 */
export function getSeasonProgress(db: LibraryDatabase, itemId: number): SeasonProgress {
  const episodes = db
    .select({
      id: schema.episodes.id,
      seasonNumber: schema.episodes.seasonNumber,
    })
    .from(schema.episodes)
    .where(and(eq(schema.episodes.itemId, itemId), ne(schema.episodes.seasonNumber, 0)))
    .orderBy(schema.episodes.seasonNumber, schema.episodes.episodeNumber)
    .all();

  if (episodes.length === 0) return { seasons: [], sequential: true };

  const watchedRows = db
    .select({ episodeId: schema.watches.episodeId })
    .from(schema.watches)
    .innerJoin(schema.episodes, eq(schema.watches.episodeId, schema.episodes.id))
    .where(and(eq(schema.episodes.itemId, itemId), ne(schema.episodes.seasonNumber, 0)))
    .groupBy(schema.watches.episodeId)
    .all();
  const watchedEpisodeIds = new Set(watchedRows.map((r) => r.episodeId));

  let sequential = true;
  let seenUnwatched = false;
  const seasonsByNumber = new Map<number, SeasonProgressEntry>();
  for (const ep of episodes) {
    const watched = watchedEpisodeIds.has(ep.id);
    if (watched && seenUnwatched) sequential = false;
    if (!watched) seenUnwatched = true;

    const entry = seasonsByNumber.get(ep.seasonNumber) ?? {
      number: ep.seasonNumber,
      watched: 0,
      total: 0,
    };
    entry.total += 1;
    if (watched) entry.watched += 1;
    seasonsByNumber.set(ep.seasonNumber, entry);
  }

  const seasons = [...seasonsByNumber.values()].sort((a, b) => a.number - b.number);
  return { seasons, sequential };
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
      airDate: schema.episodes.airDate,
      episodeType: schema.episodes.episodeType,
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
  return {
    episodeId: row.id,
    s: row.s,
    e: row.e,
    title: row.title,
    airDate: row.airDate,
    episodeType: row.episodeType,
  };
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
