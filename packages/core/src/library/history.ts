import type { ImageRef } from "@baykus/provider-sdk";
import { desc, eq } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import type { WatchSource } from "../db/schema.ts";
import * as schema from "../db/schema.ts";

export interface WatchHistoryEntry {
  watchId: number;
  watchedAt: string;
  source: WatchSource;
  itemId: number;
  title: string;
  posterRef: ImageRef | null;
  episodeId: number;
  s: number;
  e: number;
  episodeTitle: string | null;
}

/**
 * contracts/api.md §Watches — GET /api/watches/history. E27: it's a log —
 * newest-first, specials and every source included, no category scope.
 * `limit` is trusted as already-clamped (1-100); the route validates it.
 */
export function getWatchHistory(db: LibraryDatabase, limit: number): WatchHistoryEntry[] {
  return db
    .select({
      watchId: schema.watches.id,
      watchedAt: schema.watches.watchedAt,
      source: schema.watches.source,
      itemId: schema.items.id,
      title: schema.items.title,
      posterRef: schema.items.posterRef,
      episodeId: schema.episodes.id,
      s: schema.episodes.seasonNumber,
      e: schema.episodes.episodeNumber,
      episodeTitle: schema.episodes.title,
    })
    .from(schema.watches)
    .innerJoin(schema.episodes, eq(schema.episodes.id, schema.watches.episodeId))
    .innerJoin(schema.items, eq(schema.items.id, schema.watches.itemId))
    .orderBy(desc(schema.watches.watchedAt), desc(schema.watches.id))
    .limit(limit)
    .all();
}
