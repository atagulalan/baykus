import { describe, expect, it } from "vitest";
import type { LibraryDatabase } from "../db/open.ts";
import { openLibraryDb } from "../db/open.ts";
import type { TrackingStatus } from "../db/schema.ts";
import * as schema from "../db/schema.ts";
import { setRating } from "./ratings.ts";
import { getStats } from "./stats.ts";
import { addWatch } from "./watches.ts";

function insertItem(
  db: LibraryDatabase,
  status: TrackingStatus,
  episodeRunTimes: number[] | null = null,
): number {
  const item = db
    .insert(schema.items)
    .values({
      mediaType: "series",
      title: "Test Show",
      episodeRunTimes,
      addedAt: "2026-01-01T00:00:00Z",
    })
    .returning({ id: schema.items.id })
    .get();
  db.insert(schema.tracking)
    .values({
      itemId: item.id,
      status,
      pushMuted: false,
      note: null,
      statusChangedAt: "2026-01-01T00:00:00Z",
    })
    .run();
  return item.id;
}

function insertEpisode(
  db: LibraryDatabase,
  itemId: number,
  seasonNumber: number,
  episodeNumber: number,
  runtimeMin: number | null,
): number {
  return db
    .insert(schema.episodes)
    .values({ itemId, seasonNumber, episodeNumber, runtimeMin })
    .returning({ id: schema.episodes.id })
    .get().id;
}

describe("getStats", () => {
  it("counts distinct watched episodes, not watch events", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "watching");
    const ep = insertEpisode(db, itemId, 1, 1, 30);
    addWatch(db, ep, "2026-01-01T00:00:00Z");
    addWatch(db, ep, "2026-01-02T00:00:00Z");

    expect(getStats(db).episodesWatched).toBe(1);
  });

  it("watchTimeMin sums per watch event, falling back to item avg runtime, else 0 (E13)", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "watching", [40, 60]);
    const known = insertEpisode(db, itemId, 1, 1, 30);
    const unknownWithFallback = insertEpisode(db, itemId, 1, 2, null);
    const otherItem = insertItem(db, "watching", null);
    const unknownNoFallback = insertEpisode(db, otherItem, 1, 1, null);

    addWatch(db, known, "2026-01-01T00:00:00Z");
    addWatch(db, unknownWithFallback, "2026-01-02T00:00:00Z");
    addWatch(db, unknownNoFallback, "2026-01-03T00:00:00Z");

    // 30 (known) + 50 (avg of [40,60]) + 0 (no runtime, no fallback) = 80
    expect(getStats(db).watchTimeMin).toBe(80);
  });

  it("itemCount pre-fills all statuses to 0 and counts per status", () => {
    const { db } = openLibraryDb(":memory:");
    insertItem(db, "watching");
    insertItem(db, "watching");
    insertItem(db, "completed");

    expect(getStats(db).itemCount).toEqual({
      watching: 2,
      plan_to_watch: 0,
      completed: 1,
      dropped: 0,
      paused: 0,
    });
  });

  it("episodesPerMonth groups watch events by YYYY-MM, sorted chronologically", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "watching");
    const e1 = insertEpisode(db, itemId, 1, 1, 30);
    const e2 = insertEpisode(db, itemId, 1, 2, 30);
    const e3 = insertEpisode(db, itemId, 1, 3, 30);

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
    const itemId = insertItem(db, "watching");
    const ep = insertEpisode(db, itemId, 1, 1, 30);

    setRating(db, "item", itemId, 3);
    setRating(db, "episode", ep, 3);
    setRating(db, "episode", 999, 1);

    expect(getStats(db).ratingDistribution).toEqual({ "1": 1, "2": 0, "3": 2 });
  });
});
