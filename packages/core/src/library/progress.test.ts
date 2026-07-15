import { describe, expect, it } from "vitest";
import type { LibraryDatabase } from "../db/open.ts";
import { openLibraryDb } from "../db/open.ts";
import * as schema from "../db/schema.ts";
import {
  getNextAirDate,
  getNextUnwatchedEpisode,
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
