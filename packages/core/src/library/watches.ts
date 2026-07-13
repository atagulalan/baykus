import { and, eq, isNotNull, isNull, lte, ne } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import type { WatchSource } from "../db/schema.ts";
import * as schema from "../db/schema.ts";
import { todayUtc } from "./progress.ts";

type WatchRow = typeof schema.watches.$inferSelect;

/** E7: pure predicate — every aired non-special episode has >=1 watch and status != completed. */
export function suggestCompleted(db: LibraryDatabase, itemId: number): boolean {
  const tracking = db
    .select({ status: schema.tracking.status })
    .from(schema.tracking)
    .where(eq(schema.tracking.itemId, itemId))
    .get();
  if (!tracking || tracking.status === "completed") return false;

  const today = todayUtc();
  const airedNonSpecial = and(
    eq(schema.episodes.itemId, itemId),
    ne(schema.episodes.seasonNumber, 0),
    isNotNull(schema.episodes.airDate),
    lte(schema.episodes.airDate, today),
  );

  const unwatchedAired = db
    .select({ id: schema.episodes.id })
    .from(schema.episodes)
    .leftJoin(schema.watches, eq(schema.watches.episodeId, schema.episodes.id))
    .where(and(airedNonSpecial, isNull(schema.watches.id)))
    .limit(1)
    .all();
  if (unwatchedAired.length > 0) return false;

  const anyAired = db
    .select({ id: schema.episodes.id })
    .from(schema.episodes)
    .where(airedNonSpecial)
    .limit(1)
    .all();
  return anyAired.length > 0;
}

export interface AddWatchResult {
  id: number;
  episodeId: number;
  watchedAt: string;
  source: WatchSource;
  suggestCompleted: boolean;
  /** false when an identical (episodeId, watchedAt) watch already existed (idempotent replay, E6). */
  created: boolean;
}

/** Duplicate (episodeId, watchedAt) is idempotent: the existing event is returned, never thrown. */
export function addWatch(
  db: LibraryDatabase,
  episodeId: number,
  watchedAt?: string,
  source: WatchSource = "manual",
): AddWatchResult | null {
  const episode = db
    .select({ id: schema.episodes.id, itemId: schema.episodes.itemId })
    .from(schema.episodes)
    .where(eq(schema.episodes.id, episodeId))
    .get();
  if (!episode) return null;

  const at = watchedAt ?? new Date().toISOString();

  const existing = db
    .select()
    .from(schema.watches)
    .where(and(eq(schema.watches.episodeId, episodeId), eq(schema.watches.watchedAt, at)))
    .get();

  const watch: WatchRow =
    existing ??
    db
      .insert(schema.watches)
      .values({ episodeId, itemId: episode.itemId, watchedAt: at, source })
      .returning()
      .get();

  return {
    id: watch.id,
    episodeId: watch.episodeId,
    watchedAt: watch.watchedAt,
    source: watch.source,
    suggestCompleted: suggestCompleted(db, episode.itemId),
    created: !existing,
  };
}

/** E5: removes the watch event with the newest watchedAt for that episode. Returns false if none exists. */
export function removeLatestWatch(db: LibraryDatabase, episodeId: number): boolean {
  const rows = db
    .select({ id: schema.watches.id, watchedAt: schema.watches.watchedAt })
    .from(schema.watches)
    .where(eq(schema.watches.episodeId, episodeId))
    .all();
  if (rows.length === 0) return false;

  const latest = rows.reduce((a, b) => (a.watchedAt >= b.watchedAt ? a : b));
  db.delete(schema.watches).where(eq(schema.watches.id, latest.id)).run();
  return true;
}

export type BulkWatchTarget = { upToEpisodeId: number } | { seasonNumber: number };

export interface BulkWatchResult {
  created: number;
  skippedAlreadyWatched: number;
  suggestCompleted: boolean;
}

/**
 * Bulk-creates watches (source "bulk") for a set of candidate episodes, skipping any
 * that already have a watch event. Only ever considers already-aired episodes — bulk
 * actions never auto-watch something that hasn't aired yet.
 *
 * - `upToEpisodeId`: non-special episodes with (s,e) <= the target's (s,e), airing order (E2).
 * - `seasonNumber`: every episode in that exact season, specials included when 0 is passed
 *   explicitly (ui.md shows a "mark all watched" action on the specials section too).
 */
export function bulkWatch(
  db: LibraryDatabase,
  itemId: number,
  target: BulkWatchTarget,
): BulkWatchResult | null {
  const item = db
    .select({ id: schema.items.id })
    .from(schema.items)
    .where(eq(schema.items.id, itemId))
    .get();
  if (!item) return null;

  const today = todayUtc();
  const aired = and(isNotNull(schema.episodes.airDate), lte(schema.episodes.airDate, today));

  let candidates: { id: number }[];

  if ("upToEpisodeId" in target) {
    const boundary = db
      .select({ s: schema.episodes.seasonNumber, e: schema.episodes.episodeNumber })
      .from(schema.episodes)
      .where(and(eq(schema.episodes.id, target.upToEpisodeId), eq(schema.episodes.itemId, itemId)))
      .get();
    if (!boundary) return null;

    candidates = db
      .select({
        id: schema.episodes.id,
        s: schema.episodes.seasonNumber,
        e: schema.episodes.episodeNumber,
      })
      .from(schema.episodes)
      .where(and(eq(schema.episodes.itemId, itemId), ne(schema.episodes.seasonNumber, 0), aired))
      .all()
      .filter((ep) => ep.s < boundary.s || (ep.s === boundary.s && ep.e <= boundary.e));
  } else {
    candidates = db
      .select({ id: schema.episodes.id })
      .from(schema.episodes)
      .where(
        and(
          eq(schema.episodes.itemId, itemId),
          eq(schema.episodes.seasonNumber, target.seasonNumber),
          aired,
        ),
      )
      .all();
  }

  const now = new Date().toISOString();
  let created = 0;
  let skippedAlreadyWatched = 0;

  db.transaction((tx) => {
    for (const ep of candidates) {
      const existing = tx
        .select({ id: schema.watches.id })
        .from(schema.watches)
        .where(eq(schema.watches.episodeId, ep.id))
        .limit(1)
        .get();
      if (existing) {
        skippedAlreadyWatched++;
        continue;
      }
      tx.insert(schema.watches)
        .values({ episodeId: ep.id, itemId, watchedAt: now, source: "bulk" })
        .run();
      created++;
    }
  });

  return { created, skippedAlreadyWatched, suggestCompleted: suggestCompleted(db, itemId) };
}
