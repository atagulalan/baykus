import type { EpisodeType, ReleaseStatus, WatchProviderInfo } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import type { LibraryDatabase } from "../db/open.ts";
import { openLibraryDb } from "../db/open.ts";
import type { ManualList } from "../db/schema.ts";
import * as schema from "../db/schema.ts";
import { getCalendar } from "./query.ts";

function addDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function insertItem(
  db: LibraryDatabase,
  opts: {
    manualList?: ManualList | null;
    releaseStatus?: ReleaseStatus | null;
    networks?: { name: string }[];
    watchProviders?: WatchProviderInfo[];
  } = {},
): number {
  const item = db
    .insert(schema.items)
    .values({
      mediaType: "series",
      title: "Test Show",
      releaseStatus: opts.releaseStatus ?? null,
      networks: opts.networks ?? null,
      watchProviders: opts.watchProviders ?? null,
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
  airDate: string | null,
  episodeType: EpisodeType | null = null,
): number {
  return db
    .insert(schema.episodes)
    .values({ itemId, seasonNumber, episodeNumber, airDate, episodeType })
    .returning({ id: schema.episodes.id })
    .get().id;
}

/**
 * Puts an item in category "watching", robustly against whatever else a test
 * adds afterwards: one long-aired watched episode + one long-aired UNWATCHED
 * episode (so airedUnwatched stays > 0 regardless of later future episodes),
 * with a watch dated "now" so the 30-day window always holds.
 */
function markWatching(db: LibraryDatabase, itemId: number): void {
  const watched = insertEpisode(db, itemId, 9, 1, addDays(-40));
  insertEpisode(db, itemId, 9, 2, addDays(-35));
  db.insert(schema.watches)
    .values({ episodeId: watched, itemId, watchedAt: new Date().toISOString() })
    .run();
}

describe("getCalendar", () => {
  it("groups episodes by date within the default -14/+90 window", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, { networks: [{ name: "HBO" }] });
    markWatching(db, itemId);
    insertEpisode(db, itemId, 1, 1, addDays(5));
    insertEpisode(db, itemId, 1, 2, addDays(5));
    insertEpisode(db, itemId, 1, 3, addDays(10));
    insertEpisode(db, itemId, 1, 4, addDays(95)); // outside the default window

    const result = getCalendar(db);

    expect(result.days).toHaveLength(2);
    expect(result.days[0]).toMatchObject({ date: addDays(5) });
    expect(result.days[0]?.entries).toHaveLength(2);
    expect(result.days[0]?.entries[0]).toMatchObject({ title: "Test Show", network: "HBO" });
    expect(result.days[1]).toMatchObject({ date: addDays(10) });
  });

  it("scopes to the active trio — excludes stopped/watch_later/not_started/finished (E22)", () => {
    const { db } = openLibraryDb(":memory:");

    const watching = insertItem(db);
    markWatching(db, watching);
    insertEpisode(db, watching, 1, 1, addDays(3));

    const stopped = insertItem(db, { manualList: "stopped" });
    insertEpisode(db, stopped, 1, 1, addDays(3));

    const watchLater = insertItem(db, { manualList: "watch_later" });
    insertEpisode(db, watchLater, 1, 1, addDays(3));

    const notStarted = insertItem(db);
    insertEpisode(db, notStarted, 1, 1, addDays(3)); // zero watches -> not_started

    const finished = insertItem(db, { releaseStatus: "ended" });
    const finishedEp = insertEpisode(db, finished, 1, 1, addDays(-1));
    db.insert(schema.watches)
      .values({ episodeId: finishedEp, itemId: finished, watchedAt: "2026-01-01T00:00:00Z" })
      .run();
    insertEpisode(db, finished, 1, 2, addDays(3)); // scheduled but doesn't change airedUnwatched yet

    const result = getCalendar(db);
    const itemIds = result.days.flatMap((d) => d.entries.map((e) => e.itemId));
    expect(itemIds).toEqual([watching]);
  });

  it("includes specials (season 0) with seasonName (E23)", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    markWatching(db, itemId);
    db.insert(schema.seasons).values({ itemId, number: 0, name: "Specials" }).run();
    insertEpisode(db, itemId, 0, 1, addDays(3));

    const result = getCalendar(db);
    expect(result.days).toHaveLength(1);
    expect(result.days[0]?.entries[0]).toMatchObject({ s: 0, seasonName: "Specials" });
  });

  it("respects explicit from/to query bounds", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    markWatching(db, itemId);
    insertEpisode(db, itemId, 1, 1, addDays(2));
    insertEpisode(db, itemId, 1, 2, addDays(8));

    const result = getCalendar(db, { from: addDays(5), to: addDays(10) });
    expect(result.days).toHaveLength(1);
    expect(result.days[0]?.date).toBe(addDays(8));
  });

  it("E24: future episodes are always included regardless of watch state", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    markWatching(db, itemId);
    const futureEp = insertEpisode(db, itemId, 1, 1, addDays(3));
    // A future episode watched in advance (e.g. an early screener) still shows.
    db.insert(schema.watches)
      .values({ episodeId: futureEp, itemId, watchedAt: new Date().toISOString() })
      .run();

    const result = getCalendar(db);
    expect(result.days.flatMap((d) => d.entries.map((e) => e.episodeId))).toContain(futureEp);
  });

  it("past/today episodes are included with isWatched (Schedule needs continuous strips; Timeline/Month filter client-side)", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    markWatching(db, itemId);
    const pastUnwatched = insertEpisode(db, itemId, 1, 1, addDays(-3));
    const pastWatched = insertEpisode(db, itemId, 1, 2, addDays(-2));
    db.insert(schema.watches)
      .values({ episodeId: pastWatched, itemId, watchedAt: new Date().toISOString() })
      .run();
    const todayEp = insertEpisode(db, itemId, 1, 3, addDays(0));

    const result = getCalendar(db);
    const entries = result.days.flatMap((d) => d.entries);
    const byId = new Map(entries.map((e) => [e.episodeId, e]));
    expect(byId.get(pastUnwatched)?.isWatched).toBe(false);
    expect(byId.get(pastWatched)?.isWatched).toBe(true);
    expect(byId.has(todayEp)).toBe(true);
  });

  it("groups sorted ascending by date", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    markWatching(db, itemId);
    insertEpisode(db, itemId, 1, 1, addDays(10));
    insertEpisode(db, itemId, 1, 2, addDays(1));
    insertEpisode(db, itemId, 1, 3, addDays(5));

    const result = getCalendar(db);
    expect(result.days.map((d) => d.date)).toEqual([addDays(1), addDays(5), addDays(10)]);
  });

  it("carries episodeType and watchProviders through for finale badges", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, {
      watchProviders: [{ provider: "HBO Max", type: "flatrate", region: "TR" }],
    });
    markWatching(db, itemId);
    insertEpisode(db, itemId, 1, 1, addDays(5), "finale");

    const result = getCalendar(db);
    expect(result.days[0]?.entries[0]).toMatchObject({
      episodeType: "finale",
      watchProviders: [{ provider: "HBO Max", type: "flatrate", region: "TR" }],
    });
  });
});
