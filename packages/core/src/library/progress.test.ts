import { describe, expect, it } from "vitest";
import type { LibraryDatabase } from "../db/open.ts";
import { openLibraryDb } from "../db/open.ts";
import * as schema from "../db/schema.ts";
import {
  getNextAirDate,
  getNextUnwatchedEpisode,
  getSeasonProgress,
  getSeriesProgress,
  todayUtc,
} from "./progress.ts";

function addDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function insertItem(db: LibraryDatabase): number {
  return db
    .insert(schema.items)
    .values({ mediaType: "series", title: "Test Show", addedAt: "2026-01-01T00:00:00Z" })
    .returning({ id: schema.items.id })
    .get().id;
}

function insertEpisode(
  db: LibraryDatabase,
  itemId: number,
  seasonNumber: number,
  episodeNumber: number,
  airDate: string | null,
): number {
  return db
    .insert(schema.episodes)
    .values({ itemId, seasonNumber, episodeNumber, airDate })
    .returning({ id: schema.episodes.id })
    .get().id;
}

describe("getSeriesProgress", () => {
  it("excludes season 0 (specials) from watched/aired/total", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    insertEpisode(db, itemId, 0, 1, addDays(-30));
    insertEpisode(db, itemId, 1, 1, addDays(-10));
    insertEpisode(db, itemId, 1, 2, addDays(-5));
    insertEpisode(db, itemId, 1, 3, addDays(5));

    expect(getSeriesProgress(db, itemId)).toEqual({ watched: 0, aired: 2, total: 3 });
  });

  it("treats today's air date as aired (E3)", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    insertEpisode(db, itemId, 1, 1, todayUtc());

    expect(getSeriesProgress(db, itemId).aired).toBe(1);
  });

  it("never counts an unaired episode among aired/watched", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const future = insertEpisode(db, itemId, 1, 1, addDays(3));
    db.insert(schema.watches)
      .values({ episodeId: future, itemId, watchedAt: "2026-01-01T00:00:00Z", source: "manual" })
      .run();

    // Marking a future episode watched is not a real-world path (UI disables it),
    // but the aired denominator must stay accurate regardless.
    expect(getSeriesProgress(db, itemId)).toEqual({ watched: 1, aired: 0, total: 1 });
  });

  it("counts a rewatched episode once, ignoring specials even when watched", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const special = insertEpisode(db, itemId, 0, 1, addDays(-1));
    const e1 = insertEpisode(db, itemId, 1, 1, addDays(-1));
    insertEpisode(db, itemId, 1, 2, addDays(-1));

    db.insert(schema.watches)
      .values([
        { episodeId: e1, itemId, watchedAt: "2026-01-01T00:00:00Z", source: "manual" },
        { episodeId: e1, itemId, watchedAt: "2026-01-02T00:00:00Z", source: "manual" },
        { episodeId: special, itemId, watchedAt: "2026-01-01T00:00:00Z", source: "manual" },
      ])
      .run();

    expect(getSeriesProgress(db, itemId)).toEqual({ watched: 1, aired: 2, total: 2 });
  });
});

describe("getNextUnwatchedEpisode", () => {
  it("returns the first non-special episode in airing order with no watch event", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    insertEpisode(db, itemId, 0, 1, addDays(-1));
    const e1 = insertEpisode(db, itemId, 1, 1, addDays(-10));
    const e2 = insertEpisode(db, itemId, 1, 2, addDays(-5));

    db.insert(schema.watches)
      .values({ episodeId: e1, itemId, watchedAt: "2026-01-01T00:00:00Z", source: "manual" })
      .run();

    expect(getNextUnwatchedEpisode(db, itemId)).toEqual({
      episodeId: e2,
      s: 1,
      e: 2,
      title: null,
      airDate: addDays(-5),
      episodeType: null,
    });
  });

  it("carries episodeType through (FR-024)", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const e1 = db
      .insert(schema.episodes)
      .values({
        itemId,
        seasonNumber: 1,
        episodeNumber: 1,
        airDate: addDays(-1),
        episodeType: "finale",
      })
      .returning({ id: schema.episodes.id })
      .get().id;

    expect(getNextUnwatchedEpisode(db, itemId)).toMatchObject({
      episodeId: e1,
      episodeType: "finale",
    });
  });

  it("returns null once every non-special episode is watched", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const e1 = insertEpisode(db, itemId, 1, 1, addDays(-1));
    db.insert(schema.watches)
      .values({ episodeId: e1, itemId, watchedAt: "2026-01-01T00:00:00Z", source: "manual" })
      .run();

    expect(getNextUnwatchedEpisode(db, itemId)).toBeNull();
  });
});

function insertWatch(db: LibraryDatabase, episodeId: number, itemId: number, watchedAt: string) {
  db.insert(schema.watches).values({ episodeId, itemId, watchedAt, source: "manual" }).run();
}

describe("getSeasonProgress (E34)", () => {
  it("groups watched/total by season, ascending, excluding specials", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    insertEpisode(db, itemId, 0, 1, addDays(-30)); // special, excluded
    const s1e1 = insertEpisode(db, itemId, 1, 1, addDays(-10));
    insertEpisode(db, itemId, 1, 2, addDays(-5));
    insertEpisode(db, itemId, 2, 1, addDays(5)); // unaired, still counts in total
    insertWatch(db, s1e1, itemId, "2026-01-01T00:00:00Z");

    expect(getSeasonProgress(db, itemId)).toEqual({
      seasons: [
        { number: 1, watched: 1, total: 2 },
        { number: 2, watched: 0, total: 1 },
      ],
      sequential: true,
    });
  });

  it("empty library: no seasons, sequential defaults true", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    expect(getSeasonProgress(db, itemId)).toEqual({ seasons: [], sequential: true });
  });

  it("sequential true for a clean watched prefix", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const e1 = insertEpisode(db, itemId, 1, 1, addDays(-10));
    const e2 = insertEpisode(db, itemId, 1, 2, addDays(-5));
    insertEpisode(db, itemId, 1, 3, addDays(5));
    insertWatch(db, e1, itemId, "2026-01-01T00:00:00Z");
    insertWatch(db, e2, itemId, "2026-01-02T00:00:00Z");

    expect(getSeasonProgress(db, itemId).sequential).toBe(true);
  });

  it("sequential false when an episode is skipped mid-season", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const e1 = insertEpisode(db, itemId, 1, 1, addDays(-10));
    insertEpisode(db, itemId, 1, 2, addDays(-5)); // skipped
    const e3 = insertEpisode(db, itemId, 1, 3, addDays(-1));
    insertWatch(db, e1, itemId, "2026-01-01T00:00:00Z");
    insertWatch(db, e3, itemId, "2026-01-02T00:00:00Z");

    expect(getSeasonProgress(db, itemId).sequential).toBe(false);
  });

  it("sequential false when a later season has a watch before an earlier one finishes", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const s1e1 = insertEpisode(db, itemId, 1, 1, addDays(-10));
    insertEpisode(db, itemId, 1, 2, addDays(-5)); // unwatched, season 1 not finished
    const s2e1 = insertEpisode(db, itemId, 2, 1, addDays(-1));
    insertWatch(db, s1e1, itemId, "2026-01-01T00:00:00Z");
    insertWatch(db, s2e1, itemId, "2026-01-02T00:00:00Z");

    expect(getSeasonProgress(db, itemId).sequential).toBe(false);
  });

  it("fully-watched-everything: sequential true, every season watched == total", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const e1 = insertEpisode(db, itemId, 1, 1, addDays(-10));
    const e2 = insertEpisode(db, itemId, 2, 1, addDays(-5));
    insertWatch(db, e1, itemId, "2026-01-01T00:00:00Z");
    insertWatch(db, e2, itemId, "2026-01-02T00:00:00Z");

    const result = getSeasonProgress(db, itemId);
    expect(result.sequential).toBe(true);
    expect(result.seasons).toEqual([
      { number: 1, watched: 1, total: 1 },
      { number: 2, watched: 1, total: 1 },
    ]);
  });

  it("unaired episodes count in total only, never watched", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    insertEpisode(db, itemId, 1, 1, addDays(10)); // unaired, unwatched

    expect(getSeasonProgress(db, itemId)).toEqual({
      seasons: [{ number: 1, watched: 0, total: 1 }],
      sequential: true,
    });
  });
});

describe("getNextAirDate", () => {
  it("returns the earliest strictly-future non-special air date", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    insertEpisode(db, itemId, 0, 1, addDays(2));
    insertEpisode(db, itemId, 1, 1, addDays(-1));
    insertEpisode(db, itemId, 1, 2, addDays(3));
    insertEpisode(db, itemId, 1, 3, addDays(10));

    expect(getNextAirDate(db, itemId)).toBe(addDays(3));
  });

  it("returns null when nothing is scheduled in the future", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    insertEpisode(db, itemId, 1, 1, addDays(-1));

    expect(getNextAirDate(db, itemId)).toBeNull();
  });
});
