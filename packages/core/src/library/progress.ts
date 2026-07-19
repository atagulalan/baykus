import type { EpisodeType } from "@baykus/provider-sdk";
import { and, eq, ne, sql } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import * as schema from "../db/schema.ts";
import {
  episodeAiredCondition,
  episodeFutureAirCondition,
  isEpisodeAired,
  todayUtc,
} from "./airing.ts";

export { isEpisodeAired, todayUtc } from "./airing.ts";

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
  airStamp: string | null;
  episodeType: EpisodeType | null;
}

/** E1/E4: progress excludes season 0 (specials); denominator is aired, not announced. */
export function getSeriesProgress(
  db: LibraryDatabase,
  itemId: number,
  now = new Date(),
): SeriesProgress {
  const episodes = db
    .select({
      id: schema.episodes.id,
      airDate: schema.episodes.airDate,
      airStamp: schema.episodes.airStamp,
    })
    .from(schema.episodes)
    .where(and(eq(schema.episodes.itemId, itemId), ne(schema.episodes.seasonNumber, 0)))
    .all();

  const total = episodes.length;
  if (total === 0) return { watched: 0, aired: 0, total: 0 };

  const aired = episodes.filter((e) => isEpisodeAired(e, now)).length;

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
 * E34/E50: per-season watched/total (total = aired, not announced) plus
 * `sequential` — whether the watched set is a contiguous (s,e)-ordered
 * prefix of the aired list. One episode query + one grouped watch query,
 * then a single JS scan; never per-episode. Seasons with zero aired
 * episodes are omitted entirely (E50).
 */
export function getSeasonProgress(
  db: LibraryDatabase,
  itemId: number,
  now = new Date(),
): SeasonProgress {
  const episodes = db
    .select({
      id: schema.episodes.id,
      seasonNumber: schema.episodes.seasonNumber,
      episodeNumber: schema.episodes.episodeNumber,
      airDate: schema.episodes.airDate,
      airStamp: schema.episodes.airStamp,
    })
    .from(schema.episodes)
    .where(and(eq(schema.episodes.itemId, itemId), ne(schema.episodes.seasonNumber, 0)))
    .all()
    .filter((ep) => isEpisodeAired(ep, now));

  const watchedIds = new Set(
    db
      .select({ episodeId: schema.watches.episodeId })
      .from(schema.watches)
      .innerJoin(schema.episodes, eq(schema.watches.episodeId, schema.episodes.id))
      .where(and(eq(schema.episodes.itemId, itemId), ne(schema.episodes.seasonNumber, 0)))
      .groupBy(schema.watches.episodeId)
      .all()
      .map((r) => r.episodeId),
  );

  const bySeason = new Map<number, typeof episodes>();
  for (const ep of episodes) {
    const list = bySeason.get(ep.seasonNumber) ?? [];
    list.push(ep);
    bySeason.set(ep.seasonNumber, list);
  }

  const seasons: SeasonProgressEntry[] = [];
  for (const [number, eps] of [...bySeason.entries()].sort(([a], [b]) => a - b)) {
    eps.sort((a, b) => a.episodeNumber - b.episodeNumber);
    seasons.push({
      number,
      watched: eps.filter((e) => watchedIds.has(e.id)).length,
      total: eps.length,
    });
  }

  const airedOrdered = episodes.sort((a, b) =>
    a.seasonNumber !== b.seasonNumber
      ? a.seasonNumber - b.seasonNumber
      : a.episodeNumber - b.episodeNumber,
  );
  let sequential = true;
  let seenGap = false;
  for (const ep of airedOrdered) {
    if (watchedIds.has(ep.id)) {
      if (seenGap) {
        sequential = false;
        break;
      }
    } else {
      seenGap = true;
    }
  }

  return { seasons, sequential };
}

/** First non-special episode (airing order) with no watch event — aired or not. */
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
      airStamp: schema.episodes.airStamp,
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
    airStamp: row.airStamp,
    episodeType: row.episodeType,
  };
}

/** Earliest strictly-future non-special air instant, or null if none scheduled. */
export function getNextAirDate(
  db: LibraryDatabase,
  itemId: number,
  now = new Date(),
): string | null {
  const row = db
    .select({ airDate: schema.episodes.airDate, airStamp: schema.episodes.airStamp })
    .from(schema.episodes)
    .where(
      and(
        eq(schema.episodes.itemId, itemId),
        ne(schema.episodes.seasonNumber, 0),
        episodeFutureAirCondition(now),
      ),
    )
    .orderBy(sql`coalesce(${schema.episodes.airStamp}, ${schema.episodes.airDate})`)
    .limit(1)
    .get();
  return row?.airStamp?.slice(0, 10) ?? row?.airDate ?? null;
}
