import type { ReleaseStatus } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import type { LibraryDatabase } from "../db/open.ts";
import { openLibraryDb } from "../db/open.ts";
import type { ManualList } from "../db/schema.ts";
import * as schema from "../db/schema.ts";
import { setRating } from "./ratings.ts";
import { getStats } from "./stats.ts";
import { addWatch } from "./watches.ts";

function addDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function insertItem(
  db: LibraryDatabase,
  opts: {
    manualList?: ManualList | null;
    episodeRunTimes?: number[] | null;
    releaseStatus?: ReleaseStatus | null;
  } = {},
): number {
  const item = db
    .insert(schema.items)
    .values({
      mediaType: "series",
      title: "Test Show",
      episodeRunTimes: opts.episodeRunTimes ?? null,
      releaseStatus: opts.releaseStatus ?? null,
      addedAt: "2026-01-01T00:00:00Z",
    })
    .returning({ id: schema.items.id })
    .get();
  db.insert(schema.tracking)
    .values({
      itemId: item.id,
      manualList: opts.manualList ?? null,
      pushMuted: false,
      note: null,
      listChangedAt: "2026-01-01T00:00:00Z",
    })
    .run();
  return item.id;
}

function insertEpisode(
  db: LibraryDatabase,
  itemId: number,
  seasonNumber: number,
  episodeNumber: number,
  opts: { runtimeMin?: number | null; airDate?: string | null } = {},
): number {
  return db
    .insert(schema.episodes)
    .values({
      itemId,
      seasonNumber,
      episodeNumber,
      runtimeMin: opts.runtimeMin ?? null,
      airDate: opts.airDate ?? null,
    })
    .returning({ id: schema.episodes.id })
    .get().id;
}

describe("getStats", () => {
  it("counts distinct watched episodes, not watch events", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const ep = insertEpisode(db, itemId, 1, 1, { runtimeMin: 30 });
    addWatch(db, ep, "2026-01-01T00:00:00Z");
    addWatch(db, ep, "2026-01-02T00:00:00Z");

    expect(getStats(db).episodesWatched).toBe(1);
  });

  it("watchTimeMin sums per watch event, falling back to item avg runtime, else 0 (E13)", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, { episodeRunTimes: [40, 60] });
    const known = insertEpisode(db, itemId, 1, 1, { runtimeMin: 30 });
    const unknownWithFallback = insertEpisode(db, itemId, 1, 2);
    const otherItem = insertItem(db);
    const unknownNoFallback = insertEpisode(db, otherItem, 1, 1);

    addWatch(db, known, "2026-01-01T00:00:00Z");
    addWatch(db, unknownWithFallback, "2026-01-02T00:00:00Z");
    addWatch(db, unknownNoFallback, "2026-01-03T00:00:00Z");

    // 30 (known) + 50 (avg of [40,60]) + 0 (no runtime, no fallback) = 80
    expect(getStats(db).watchTimeMin).toBe(80);
  });

  it("itemCount pre-fills all 7 categories to 0 and counts per category (mixed library)", () => {
    const { db } = openLibraryDb(":memory:");

    insertItem(db, { manualList: "watch_later" });
    insertItem(db, { manualList: "stopped" });

    const notStarted = insertItem(db);
    insertEpisode(db, notStarted, 1, 1, { airDate: addDays(-10) });

    const finished = insertItem(db, { releaseStatus: "ended" });
    const finishedEp = insertEpisode(db, finished, 1, 1, { airDate: addDays(-10) });
    addWatch(db, finishedEp, "2026-01-01T00:00:00Z");

    const upToDate = insertItem(db, { releaseStatus: "returning" });
    const upToDateEp = insertEpisode(db, upToDate, 1, 1, { airDate: addDays(-10) });
    addWatch(db, upToDateEp, "2026-01-01T00:00:00Z");

    const watching = insertItem(db);
    const watchingWatched = insertEpisode(db, watching, 1, 1, { airDate: addDays(-10) });
    insertEpisode(db, watching, 1, 2, { airDate: addDays(-5) }); // aired, unwatched
    addWatch(db, watchingWatched, new Date().toISOString());

    const notRecent = insertItem(db);
    const notRecentWatched = insertEpisode(db, notRecent, 1, 1, { airDate: addDays(-100) });
    insertEpisode(db, notRecent, 1, 2, { airDate: addDays(-95) }); // aired, unwatched
    addWatch(db, notRecentWatched, "2025-01-01T00:00:00Z");

    expect(getStats(db).itemCount).toEqual({
      watching: 1,
      not_watched_recently: 1,
      not_started: 1,
      watch_later: 1,
      up_to_date: 1,
      finished: 1,
      stopped: 1,
    });
  });

  it("episodesPerMonth groups watch events by YYYY-MM, sorted chronologically", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const e1 = insertEpisode(db, itemId, 1, 1, { runtimeMin: 30 });
    const e2 = insertEpisode(db, itemId, 1, 2, { runtimeMin: 30 });
    const e3 = insertEpisode(db, itemId, 1, 3, { runtimeMin: 30 });

    addWatch(db, e1, "2026-02-01T00:00:00Z");
    addWatch(db, e2, "2026-01-15T00:00:00Z");
    addWatch(db, e3, "2026-01-20T00:00:00Z");

    expect(getStats(db).episodesPerMonth).toEqual([
      { month: "2026-01", count: 2 },
      { month: "2026-02", count: 1 },
    ]);
  });

  it("ratingDistribution counts item and episode ratings together", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const ep = insertEpisode(db, itemId, 1, 1, { runtimeMin: 30 });

    setRating(db, "item", itemId, 3);
    setRating(db, "episode", ep, 3);
    setRating(db, "episode", 999, 1);

    expect(getStats(db).ratingDistribution).toEqual({ "1": 1, "2": 0, "3": 2 });
  });
});
