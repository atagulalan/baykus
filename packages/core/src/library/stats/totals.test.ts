import type { GenreInfo, NetworkInfo, ReleaseStatus } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import type { LibraryDatabase } from "../../db/open.ts";
import { openLibraryDb } from "../../db/open.ts";
import type { ManualList } from "../../db/schema.ts";
import * as schema from "../../db/schema.ts";
import { setRating } from "../ratings.ts";
import { addWatch } from "../watches.ts";
import { getStats } from "./index.ts";

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
    favorite?: boolean;
    genres?: GenreInfo[] | null;
    networks?: NetworkInfo[] | null;
    title?: string;
  } = {},
): number {
  const item = db
    .insert(schema.items)
    .values({
      mediaType: "series",
      title: opts.title ?? "Test Show",
      episodeRunTimes: opts.episodeRunTimes ?? null,
      releaseStatus: opts.releaseStatus ?? null,
      genres: opts.genres ?? null,
      networks: opts.networks ?? null,
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
      favorite: opts.favorite ?? false,
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

describe("getStats — empty library", () => {
  it("zeroes every 008 aggregate, never errors", () => {
    const { db } = openLibraryDb(":memory:");
    const stats = getStats(db);

    expect(stats.seriesCount).toBe(0);
    expect(stats.favoritesCount).toBe(0);
    expect(stats.datedWatches).toEqual({ dated: 0, total: 0 });
    expect(stats.mostWatchedByTime).toEqual([]);
    expect(stats.favoriteProgress).toEqual([]);
    expect(stats.production).toEqual({ ongoing: 0, ended: 0, ongoingItems: [] });
    expect(stats.genreDistribution).toEqual({ top: [], other: 0 });
    expect(stats.networkDistribution).toEqual({ networkCount: 0, top: [], other: 0 });
    expect(stats.backlog).toEqual({ episodes: 0, seriesCount: 0, watchTimeMin: 0, topSeries: [] });
    expect(stats.rewatchSummary).toEqual({
      totalRewatches: 0,
      rewatchedEpisodes: 0,
      bySeries: [],
    });
  });
});

describe("getStats — seriesCount/favoritesCount", () => {
  it("counts every tracked item and only favorited ones", () => {
    const { db } = openLibraryDb(":memory:");
    insertItem(db, { favorite: true });
    insertItem(db, { favorite: false });
    insertItem(db, { favorite: true });

    const stats = getStats(db);
    expect(stats.seriesCount).toBe(3);
    expect(stats.favoritesCount).toBe(2);
  });
});

describe("getStats — datedWatches (E95)", () => {
  it("splits dated vs total watch events", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const ep = insertEpisode(db, itemId, 1, 1, { runtimeMin: 30 });

    addWatch(db, ep, "2026-01-01T00:00:00Z");
    addWatch(db, ep, "2026-01-02T00:00:00Z", "import:tvtime", { dateUnknown: true });

    expect(getStats(db).datedWatches).toEqual({ dated: 1, total: 2 });
  });
});

describe("getStats — mostWatchedByTime (E110)", () => {
  it("ranks items by summed watch time across all watch events, rewatches included", () => {
    const { db } = openLibraryDb(":memory:");
    const big = insertItem(db, { title: "Big Show" });
    const bigEp = insertEpisode(db, big, 1, 1, { runtimeMin: 60 });
    addWatch(db, bigEp, "2026-01-01T00:00:00Z");
    addWatch(db, bigEp, "2026-01-02T00:00:00Z"); // rewatch — counts again

    const small = insertItem(db, { title: "Small Show" });
    const smallEp = insertEpisode(db, small, 1, 1, { runtimeMin: 20 });
    addWatch(db, smallEp, "2026-01-01T00:00:00Z");

    expect(getStats(db).mostWatchedByTime).toEqual([
      { itemId: big, title: "Big Show", watchTimeMin: 120 },
      { itemId: small, title: "Small Show", watchTimeMin: 20 },
    ]);
  });
});

describe("getStats — favoriteProgress (E108)", () => {
  it("counts non-special watched/aired episodes only, sorted by watched desc", () => {
    const { db } = openLibraryDb(":memory:");
    const fav = insertItem(db, { favorite: true, title: "Favorite Show" });
    const special = insertEpisode(db, fav, 0, 1, { airDate: addDays(-10) });
    const s1e1 = insertEpisode(db, fav, 1, 1, { airDate: addDays(-10) });
    insertEpisode(db, fav, 1, 2, { airDate: addDays(-5) }); // aired, unwatched
    addWatch(db, s1e1, "2026-01-01T00:00:00Z");
    addWatch(db, special, "2026-01-01T00:00:00Z"); // special — must not count

    const notFav = insertItem(db, { favorite: false, title: "Not Favorite" });
    insertEpisode(db, notFav, 1, 1, { airDate: addDays(-10) });

    expect(getStats(db).favoriteProgress).toEqual([
      { itemId: fav, title: "Favorite Show", watchedEpisodes: 1, airedEpisodes: 2 },
    ]);
  });
});

describe("getStats — production (E109)", () => {
  it("splits ongoing (returning/in_production) vs ended (everything else incl. null), alphabetical grid", () => {
    const { db } = openLibraryDb(":memory:");
    const zebra = insertItem(db, { releaseStatus: "returning", title: "Zebra" });
    insertEpisode(db, zebra, 1, 1, { airDate: addDays(-10) });
    const apple = insertItem(db, { releaseStatus: "in_production", title: "Apple" });
    insertItem(db, { releaseStatus: "ended", title: "Ended Show" });
    insertItem(db, { releaseStatus: null, title: "Unknown Status" });

    const stats = getStats(db);
    expect(stats.production.ongoing).toBe(2);
    expect(stats.production.ended).toBe(2);
    expect(stats.production.ongoingItems.map((i) => i.title)).toEqual(["Apple", "Zebra"]);
    expect(stats.production.ongoingItems.find((i) => i.itemId === zebra)).toEqual({
      itemId: zebra,
      title: "Zebra",
      watchedEpisodes: 0,
      airedEpisodes: 1,
    });
    expect(stats.production.ongoingItems.find((i) => i.itemId === apple)?.airedEpisodes).toBe(0);
  });
});

describe("getStats — genreDistribution (E98)", () => {
  it("multi-counts an episode toward every genre, and buckets no-genre items into other", () => {
    const { db } = openLibraryDb(":memory:");
    const drama = insertItem(db, { genres: [{ name: "Drama" }, { name: "Thriller" }] });
    const dramaEp = insertEpisode(db, drama, 1, 1, { runtimeMin: 30 });
    addWatch(db, dramaEp, "2026-01-01T00:00:00Z");

    const noGenre = insertItem(db, { genres: null });
    const noGenreEp = insertEpisode(db, noGenre, 1, 1, { runtimeMin: 30 });
    addWatch(db, noGenreEp, "2026-01-01T00:00:00Z");

    const stats = getStats(db);
    expect(stats.genreDistribution.top).toEqual(
      expect.arrayContaining([
        { name: "Drama", episodes: 1 },
        { name: "Thriller", episodes: 1 },
      ]),
    );
    // The no-genre item's watched episode lands in `other`, not a phantom genre.
    expect(stats.genreDistribution.other).toBe(1);
  });
});

describe("getStats — networkDistribution (E98)", () => {
  it("attributes only the first-listed network, counts networkCount across all tracked items", () => {
    const { db } = openLibraryDb(":memory:");
    const netflix = insertItem(db, {
      networks: [{ name: "Netflix" }, { name: "Second Network" }],
    });
    const netflixEp = insertEpisode(db, netflix, 1, 1, { runtimeMin: 30 });
    addWatch(db, netflixEp, "2026-01-01T00:00:00Z");

    // Unwatched item still counts toward networkCount (distinct across tracked items).
    insertItem(db, { networks: [{ name: "HBO" }] });

    const noNetwork = insertItem(db, { networks: null });
    const noNetworkEp = insertEpisode(db, noNetwork, 1, 1, { runtimeMin: 30 });
    addWatch(db, noNetworkEp, "2026-01-01T00:00:00Z");

    const stats = getStats(db);
    expect(stats.networkDistribution.networkCount).toBe(2); // Netflix, HBO — "Second Network" never primary
    expect(stats.networkDistribution.top).toEqual([{ name: "Netflix", episodes: 1 }]);
    expect(stats.networkDistribution.other).toBe(1); // the no-network item's watched episode
  });
});

describe("getStats — backlog (E99)", () => {
  it("counts aired, unwatched, non-special episodes over the active trio only", () => {
    const { db } = openLibraryDb(":memory:");

    // "watching": one watched, one aired-unwatched remaining (30min).
    const watching = insertItem(db);
    const watchedEp = insertEpisode(db, watching, 1, 1, {
      airDate: addDays(-10),
      runtimeMin: 30,
    });
    insertEpisode(db, watching, 1, 2, { airDate: addDays(-5), runtimeMin: 45 });
    addWatch(db, watchedEp, new Date().toISOString());

    // manual "watch_later" item: not in the active trio, its remaining episode must be excluded.
    const watchLater = insertItem(db, { manualList: "watch_later" });
    insertEpisode(db, watchLater, 1, 1, { airDate: addDays(-10), runtimeMin: 999 });

    const stats = getStats(db);
    expect(stats.backlog).toEqual({
      episodes: 1,
      seriesCount: 1,
      watchTimeMin: 45,
      topSeries: [{ itemId: watching, title: "Test Show", episodes: 1 }],
    });
    void watchLater;
  });
});

describe("getStats — rewatchSummary (E103)", () => {
  it("sums (watchCount - 1) across rewatched episodes, grouped by series", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, { title: "Rewatched Show" });
    const ep = insertEpisode(db, itemId, 1, 1, { runtimeMin: 30 });
    addWatch(db, ep, "2026-01-01T00:00:00Z");
    addWatch(db, ep, "2026-01-02T00:00:00Z");
    addWatch(db, ep, "2026-01-03T00:00:00Z");

    expect(getStats(db).rewatchSummary).toEqual({
      totalRewatches: 2,
      rewatchedEpisodes: 1,
      bySeries: [{ itemId, title: "Rewatched Show", rewatches: 2 }],
    });
  });
});

describe("getStats — existing fields stay byte-compatible (E111)", () => {
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

  it("itemCount pre-fills all 8 categories to 0 and counts per category (mixed library)", () => {
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
      needs_review: 0,
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
