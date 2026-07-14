import type { EpisodeType, WatchProviderInfo } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import type { LibraryDatabase } from "../db/open.ts";
import { openLibraryDb } from "../db/open.ts";
import type { TrackingStatus } from "../db/schema.ts";
import * as schema from "../db/schema.ts";
import { getCalendar } from "./query.ts";

function addDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function setupItem(
  db: LibraryDatabase,
  status: TrackingStatus,
  overrides: { networks?: { name: string }[]; watchProviders?: WatchProviderInfo[] } = {},
): number {
  const item = db
    .insert(schema.items)
    .values({
      mediaType: "series",
      title: "Test Show",
      networks: overrides.networks ?? null,
      watchProviders: overrides.watchProviders ?? null,
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
  airDate: string | null,
  episodeType: EpisodeType | null = null,
): number {
  return db
    .insert(schema.episodes)
    .values({ itemId, seasonNumber, episodeNumber, airDate, episodeType })
    .returning({ id: schema.episodes.id })
    .get().id;
}

describe("getCalendar", () => {
  it("groups upcoming episodes by date within the default 30-day window", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "watching", { networks: [{ name: "HBO" }] });
    insertEpisode(db, itemId, 1, 1, addDays(5));
    insertEpisode(db, itemId, 1, 2, addDays(5));
    insertEpisode(db, itemId, 1, 3, addDays(10));
    insertEpisode(db, itemId, 1, 4, addDays(40)); // outside the window

    const result = getCalendar(db);

    expect(result.upcoming).toHaveLength(2);
    expect(result.upcoming[0]).toMatchObject({ date: addDays(5) });
    expect(result.upcoming[0]?.entries).toHaveLength(2);
    expect(result.upcoming[0]?.entries[0]).toMatchObject({ title: "Test Show", network: "HBO" });
    expect(result.upcoming[1]).toMatchObject({ date: addDays(10) });
  });

  it("excludes specials and non-watching items from upcoming", () => {
    const { db } = openLibraryDb(":memory:");
    const watchingId = setupItem(db, "watching");
    const droppedId = setupItem(db, "dropped");
    insertEpisode(db, watchingId, 0, 1, addDays(3)); // special
    insertEpisode(db, droppedId, 1, 1, addDays(3)); // dropped status

    const result = getCalendar(db);
    expect(result.upcoming).toHaveLength(0);
  });

  it("respects explicit from/to query bounds", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "watching");
    insertEpisode(db, itemId, 1, 1, addDays(2));
    insertEpisode(db, itemId, 1, 2, addDays(8));

    const result = getCalendar(db, { from: addDays(5), to: addDays(10) });
    expect(result.upcoming).toHaveLength(1);
    expect(result.upcoming[0]?.date).toBe(addDays(8));
  });

  it("recentlyAired lists unwatched episodes from the last 14 days, watching only", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "watching", {
      watchProviders: [{ provider: "HBO Max", type: "flatrate", region: "TR" }],
    });
    const recentUnwatched = insertEpisode(db, itemId, 1, 1, addDays(-5));
    const recentWatched = insertEpisode(db, itemId, 1, 2, addDays(-3));
    insertEpisode(db, itemId, 1, 3, addDays(-20)); // outside the 14-day window

    db.insert(schema.watches)
      .values({ episodeId: recentWatched, itemId, watchedAt: "2026-01-01T00:00:00Z" })
      .run();

    const result = getCalendar(db);
    expect(result.recentlyAired).toHaveLength(1);
    expect(result.recentlyAired[0]).toMatchObject({
      episodeId: recentUnwatched,
      airDate: addDays(-5),
      watchProviders: [{ provider: "HBO Max", type: "flatrate", region: "TR" }],
    });
  });

  it("recentlyAired excludes non-watching items", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "completed");
    insertEpisode(db, itemId, 1, 1, addDays(-2));

    const result = getCalendar(db);
    expect(result.recentlyAired).toHaveLength(0);
  });

  it("carries episodeType through for finale badges", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "watching");
    insertEpisode(db, itemId, 1, 1, addDays(5), "finale");

    const result = getCalendar(db);
    expect(result.upcoming[0]?.entries[0]?.episodeType).toBe("finale");
  });
});
