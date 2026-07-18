import type { EpisodeType } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import type { LibraryDatabase } from "../db/open.ts";
import { openLibraryDb } from "../db/open.ts";
import type { WatchSource } from "../db/schema.ts";
import * as schema from "../db/schema.ts";
import { getWatchHistory } from "./history.ts";

function insertItem(db: LibraryDatabase, title: string): number {
  const item = db
    .insert(schema.items)
    .values({
      mediaType: "series",
      title,
      posterRef: "tmdb:/x.jpg",
      addedAt: "2026-01-01T00:00:00Z",
    })
    .returning({ id: schema.items.id })
    .get();
  db.insert(schema.tracking)
    .values({
      itemId: item.id,
      manualList: null,
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
  title: string | null = null,
  opts: { airDate?: string | null; episodeType?: EpisodeType | null } = {},
): number {
  return db
    .insert(schema.episodes)
    .values({
      itemId,
      seasonNumber,
      episodeNumber,
      title,
      airDate: opts.airDate ?? null,
      episodeType: opts.episodeType ?? null,
    })
    .returning({ id: schema.episodes.id })
    .get().id;
}

function addWatch(
  db: LibraryDatabase,
  episodeId: number,
  itemId: number,
  watchedAt: string,
  source: WatchSource = "manual",
): number {
  return db
    .insert(schema.watches)
    .values({ episodeId, itemId, watchedAt, source })
    .returning({ id: schema.watches.id })
    .get().id;
}

describe("getWatchHistory", () => {
  it("returns newest-first", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "Test Show");
    const ep1 = insertEpisode(db, itemId, 1, 1);
    const ep2 = insertEpisode(db, itemId, 1, 2);
    addWatch(db, ep1, itemId, "2026-01-01T10:00:00Z");
    addWatch(db, ep2, itemId, "2026-01-03T10:00:00Z");
    addWatch(db, ep1, itemId, "2026-01-02T10:00:00Z");

    const result = getWatchHistory(db, 30);
    expect(result.map((r) => r.watchedAt)).toEqual([
      "2026-01-03T10:00:00Z",
      "2026-01-02T10:00:00Z",
      "2026-01-01T10:00:00Z",
    ]);
  });

  it("order=oldest returns the earliest watches, not a reverse of the newest window", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "Test Show");
    const ep = insertEpisode(db, itemId, 1, 1);
    for (let i = 1; i <= 5; i++) {
      addWatch(db, ep, itemId, `2026-01-0${i}T10:00:00Z`);
    }

    const newest = getWatchHistory(db, 2, "newest");
    expect(newest.map((r) => r.watchedAt)).toEqual([
      "2026-01-05T10:00:00Z",
      "2026-01-04T10:00:00Z",
    ]);

    const oldest = getWatchHistory(db, 2, "oldest");
    expect(oldest.map((r) => r.watchedAt)).toEqual([
      "2026-01-01T10:00:00Z",
      "2026-01-02T10:00:00Z",
    ]);
  });

  it("respects the limit", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "Test Show");
    const ep = insertEpisode(db, itemId, 1, 1);
    for (let i = 0; i < 5; i++) {
      addWatch(db, ep, itemId, `2026-01-0${i + 1}T10:00:00Z`);
    }

    const result = getWatchHistory(db, 2);
    expect(result).toHaveLength(2);
  });

  it("includes specials", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "Test Show");
    const special = insertEpisode(db, itemId, 0, 1, "Behind the Scenes");
    addWatch(db, special, itemId, "2026-01-01T10:00:00Z");

    const result = getWatchHistory(db, 30);
    expect(result).toHaveLength(1);
    expect(result[0]?.s).toBe(0);
  });

  it("includes every source", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "Test Show");
    const ep1 = insertEpisode(db, itemId, 1, 1);
    const ep2 = insertEpisode(db, itemId, 1, 2);
    addWatch(db, ep1, itemId, "2026-01-01T10:00:00Z", "import:tvtime");
    addWatch(db, ep2, itemId, "2026-01-02T10:00:00Z", "import:zip");

    const result = getWatchHistory(db, 30);
    expect(result.map((r) => r.source).sort()).toEqual(["import:tvtime", "import:zip"]);
  });

  it("joins itemId/title/posterRef and episode s/e/title correctly", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "House of the Dragon");
    const ep = insertEpisode(db, itemId, 2, 7, "The Red Sowing", {
      airDate: "2026-07-14",
      episodeType: "finale",
    });
    const watchId = addWatch(db, ep, itemId, "2026-07-14T21:30:00Z", "manual");

    const result = getWatchHistory(db, 30);
    expect(result[0]).toEqual({
      watchId,
      watchedAt: "2026-07-14T21:30:00Z",
      source: "manual",
      itemId,
      title: "House of the Dragon",
      posterRef: "tmdb:/x.jpg",
      episodeId: ep,
      s: 2,
      e: 7,
      episodeTitle: "The Red Sowing",
      airDate: "2026-07-14",
      episodeType: "finale",
    });
  });

  it("airDate/episodeType are null-safe when the episode has neither (E38)", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "Test Show");
    const ep = insertEpisode(db, itemId, 1, 1);
    addWatch(db, ep, itemId, "2026-01-01T10:00:00Z");

    const result = getWatchHistory(db, 30);
    expect(result[0]).toMatchObject({ airDate: null, episodeType: null });
  });
});
