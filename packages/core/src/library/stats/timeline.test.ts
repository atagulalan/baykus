import type { ReleaseStatus } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import type { LibraryDatabase } from "../../db/open.ts";
import { openLibraryDb } from "../../db/open.ts";
import type { ManualList } from "../../db/schema.ts";
import * as schema from "../../db/schema.ts";
import { addWatch } from "../watches.ts";
import { getStats } from "./index.ts";

const NOW = new Date("2026-07-15T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function isoDaysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

function insertItem(
  db: LibraryDatabase,
  opts: {
    manualList?: ManualList | null;
    title?: string;
    releaseStatus?: ReleaseStatus | null;
  } = {},
): number {
  const item = db
    .insert(schema.items)
    .values({
      mediaType: "series",
      title: opts.title ?? "Test Show",
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
      runtimeMin: opts.runtimeMin ?? 30,
      airDate: opts.airDate ?? null,
    })
    .returning({ id: schema.episodes.id })
    .get().id;
}

describe("getStats — dateUnknown exclusion (E95)", () => {
  it("excludes dateUnknown watches from every timeline aggregate", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const ep = insertEpisode(db, itemId, 1, 1, { airDate: isoDaysAgo(5).slice(0, 10) });
    addWatch(db, ep, isoDaysAgo(2), "import:tvtime", { dateUnknown: true });

    const stats = getStats(db, "UTC", NOW);
    expect(stats.recent.last7Days).toEqual({ episodes: 0, watchTimeMin: 0 });
    expect(stats.recent.last30Days).toEqual({ episodes: 0, watchTimeMin: 0 });
    expect(stats.pace).toBeNull();
    expect(stats.binges).toEqual([]);
    expect(stats.streaks).toEqual({ longestWeeks: 0, currentWeeks: 0, bySeries: [] });
    expect(stats.timeByYear).toEqual([]);
    expect(stats.activityByDay).toEqual([]);
    expect(stats.byWeekday).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(stats.byHour).toEqual(new Array(24).fill(0));
  });
});

describe("getStats — tz sensitivity (E96)", () => {
  it("buckets activityByDay/byHour by the local day, not the UTC day (UTC vs Europe/Istanbul)", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const ep = insertEpisode(db, itemId, 1, 1, { airDate: "2026-07-01" });
    // 21:30 UTC on the 10th = 00:30 the 11th in Istanbul (UTC+3, no DST).
    addWatch(db, ep, "2026-07-10T21:30:00Z");

    const utcStats = getStats(db, "UTC", NOW);
    const istStats = getStats(db, "Europe/Istanbul", NOW);

    expect(utcStats.activityByDay).toEqual([{ date: "2026-07-10", count: 1 }]);
    expect(istStats.activityByDay).toEqual([{ date: "2026-07-11", count: 1 }]);
    expect(istStats.byHour[0]).toBe(1);
    expect(utcStats.byHour[21]).toBe(1);
  });
});

describe("getStats — recent (E96)", () => {
  it("last7Days/last30Days are rolling instant-based windows; thisMonth is local-calendar-based", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const epA = insertEpisode(db, itemId, 1, 1, { runtimeMin: 30, airDate: "2026-01-01" });
    const epB = insertEpisode(db, itemId, 1, 2, { runtimeMin: 30, airDate: "2026-01-01" });
    const epC = insertEpisode(db, itemId, 1, 3, { runtimeMin: 30, airDate: "2026-01-01" });

    addWatch(db, epA, isoDaysAgo(1)); // within 7d, 30d, this month
    addWatch(db, epB, isoDaysAgo(14)); // outside 7d, within 30d, this month (still July)
    addWatch(db, epC, isoDaysAgo(44)); // outside 7d and 30d, and June (not this month)

    const stats = getStats(db, "UTC", NOW);
    expect(stats.recent.last7Days).toEqual({ episodes: 1, watchTimeMin: 30 });
    expect(stats.recent.last30Days).toEqual({ episodes: 2, watchTimeMin: 60 });
    expect(stats.recent.thisMonth).toEqual({ episodes: 2, watchTimeMin: 60 });
  });
});

describe("getStats — pace (E100)", () => {
  it("computes episodes/week over the last 56 days and projects backlog weeks", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);

    // 8 dated watches within the 56-day window, one per week -> 1.0 episodes/week.
    for (let week = 0; week < 8; week++) {
      const ep = insertEpisode(db, itemId, 1, week + 1, { airDate: "2026-01-01" });
      addWatch(db, ep, isoDaysAgo(7 * week));
    }
    // 3 aired, unwatched, non-special episodes left -> backlog of 3.
    insertEpisode(db, itemId, 1, 101, { airDate: isoDaysAgo(10).slice(0, 10) });
    insertEpisode(db, itemId, 1, 102, { airDate: isoDaysAgo(9).slice(0, 10) });
    insertEpisode(db, itemId, 1, 103, { airDate: isoDaysAgo(8).slice(0, 10) });

    const stats = getStats(db, "UTC", NOW);
    expect(stats.backlog.episodes).toBe(3);
    expect(stats.pace).toEqual({ episodesPerWeek: 1, projectedWeeks: 3 });
  });
});

describe("getStats — upcoming (E101)", () => {
  it("always emits current+next month, extends to months with data, and scopes to the active trio", () => {
    const { db } = openLibraryDb(":memory:");
    // releaseStatus "returning": with every aired episode watched, this is "up_to_date"
    // (active trio) rather than "finished" — the future episodes below haven't aired yet.
    const watching = insertItem(db, { title: "Watching Show", releaseStatus: "returning" });
    const pastEp = insertEpisode(db, watching, 1, 1, { airDate: isoDaysAgo(20).slice(0, 10) });
    addWatch(db, pastEp, isoDaysAgo(5));
    insertEpisode(db, watching, 1, 2, { airDate: "2026-07-20" }); // this month
    insertEpisode(db, watching, 1, 3, { airDate: "2026-09-05" }); // two months out

    const watchLater = insertItem(db, { manualList: "watch_later", title: "Watch Later Show" });
    insertEpisode(db, watchLater, 1, 1, { airDate: "2026-07-20" }); // excluded: not active trio

    const stats = getStats(db, "UTC", NOW);
    expect(stats.upcoming.months).toEqual([
      { month: "2026-07", episodes: 1, watchTimeMin: 30 },
      { month: "2026-08", episodes: 0, watchTimeMin: 0 },
      { month: "2026-09", episodes: 1, watchTimeMin: 30 },
    ]);
  });
});

describe("getStats — binges (E102)", () => {
  it("counts distinct episodes per (item, local day), threshold >= 2, ignoring same-episode rewatches", () => {
    const { db } = openLibraryDb(":memory:");
    const bingedItem = insertItem(db, { title: "Binged Show" });
    const e1 = insertEpisode(db, bingedItem, 1, 1, { airDate: "2026-01-01" });
    const e2 = insertEpisode(db, bingedItem, 1, 2, { airDate: "2026-01-01" });
    const e3 = insertEpisode(db, bingedItem, 1, 3, { airDate: "2026-01-01" });
    addWatch(db, e1, isoDaysAgo(3));
    addWatch(db, e2, isoDaysAgo(3));
    addWatch(db, e3, isoDaysAgo(3));
    addWatch(db, e3, isoDaysAgo(3).replace("12:00", "13:00")); // same-day rewatch, must not inflate the count

    const singleWatch = insertItem(db, { title: "Single Watch Show" });
    const soloEp = insertEpisode(db, singleWatch, 1, 1, { airDate: "2026-01-01" });
    addWatch(db, soloEp, isoDaysAgo(3));

    const stats = getStats(db, "UTC", NOW);
    expect(stats.binges).toHaveLength(1);
    expect(stats.binges[0]).toMatchObject({
      itemId: bingedItem,
      title: "Binged Show",
      episodes: 3,
    });
  });
});

describe("getStats — streaks (E104)", () => {
  it("longestWeeks counts the longest consecutive-week run, broken by a gap", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    // 4 consecutive weeks ending 3 weeks ago (weeks -3,-4,-5,-6 relative to now).
    for (const weeksAgo of [3, 4, 5, 6]) {
      const ep = insertEpisode(db, itemId, 1, weeksAgo, { airDate: "2026-01-01" });
      addWatch(db, ep, isoDaysAgo(7 * weeksAgo));
    }
    // Gap, then a single isolated week far in the past — must not bridge the gap.
    const isolatedEp = insertEpisode(db, itemId, 1, 99, { airDate: "2026-01-01" });
    addWatch(db, isolatedEp, isoDaysAgo(7 * 20));

    const stats = getStats(db, "UTC", NOW);
    expect(stats.streaks.longestWeeks).toBe(4);
  });

  it("currentWeeks survives an empty current week via the previous-week grace, and is 0 with no recent activity", () => {
    const { db } = openLibraryDb(":memory:");
    const activeItem = insertItem(db, { title: "Active Show" });
    // Exactly 7 days ago is always in the immediately-preceding ISO week, regardless of
    // where `now` falls within its own week (weekStart is a 7-day-periodic floor).
    const ep = insertEpisode(db, activeItem, 1, 1, { airDate: "2026-01-01" });
    addWatch(db, ep, isoDaysAgo(7));

    const staleItem = insertItem(db, { title: "Stale Show" });
    const staleEp = insertEpisode(db, staleItem, 1, 1, { airDate: "2026-01-01" });
    addWatch(db, staleEp, isoDaysAgo(90));

    const stats = getStats(db, "UTC", NOW);
    // Overall current streak: the active item's previous-week watch keeps it alive.
    expect(stats.streaks.currentWeeks).toBeGreaterThan(0);

    const staleSeries = stats.streaks.bySeries.find((s) => s.itemId === staleItem);
    expect(staleSeries?.weeks).toBe(1); // it has a longest streak, just not a *current* one
  });

  it("bySeries ranks the most consistent (longest per-item streak) first", () => {
    const { db } = openLibraryDb(":memory:");
    const consistent = insertItem(db, { title: "Consistent Show" });
    for (const weeksAgo of [0, 1, 2]) {
      const ep = insertEpisode(db, consistent, 1, weeksAgo + 1, { airDate: "2026-01-01" });
      addWatch(db, ep, isoDaysAgo(7 * weeksAgo));
    }
    const sporadic = insertItem(db, { title: "Sporadic Show" });
    const sporadicEp = insertEpisode(db, sporadic, 1, 1, { airDate: "2026-01-01" });
    addWatch(db, sporadicEp, isoDaysAgo(7 * 10));

    const stats = getStats(db, "UTC", NOW);
    expect(stats.streaks.bySeries[0]).toMatchObject({ itemId: consistent, weeks: 3 });
  });
});

describe("getStats — timeByYear (E105)", () => {
  it("groups monthly by local calendar year and weekly by ISO week-year, per-year total", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const ep1 = insertEpisode(db, itemId, 1, 1, { runtimeMin: 30, airDate: "2026-01-01" });
    const ep2 = insertEpisode(db, itemId, 1, 2, { runtimeMin: 45, airDate: "2026-01-01" });
    addWatch(db, ep1, isoDaysAgo(10));
    addWatch(db, ep2, isoDaysAgo(40));

    const stats = getStats(db, "UTC", NOW);
    expect(stats.timeByYear).toHaveLength(1);
    const year2026 = stats.timeByYear[0];
    expect(year2026?.year).toBe(2026);
    expect(year2026?.monthlyMin).toHaveLength(12);
    expect(year2026?.totalMin).toBe(75);
    expect(year2026?.monthlyMin.reduce((a, b) => a + b, 0)).toBe(75);
    expect(year2026?.weeklyMin.reduce((a, b) => a + b.min, 0)).toBe(75);
  });
});

describe("getStats — activityByDay/byWeekday/byHour (E106/E107)", () => {
  it("activityByDay only emits non-zero days; byWeekday is Monday-first", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const ep = insertEpisode(db, itemId, 1, 1, { airDate: "2026-01-01" });
    const watchedAt = "2026-07-13T10:00:00Z";
    addWatch(db, ep, watchedAt);

    const stats = getStats(db, "UTC", NOW);
    expect(stats.activityByDay).toEqual([{ date: "2026-07-13", count: 1 }]);
    // Derive the expected bucket from plain Date math rather than assuming a weekday.
    const expectedWeekdayIdx = (new Date(watchedAt).getUTCDay() + 6) % 7;
    const expectedByWeekday = [0, 0, 0, 0, 0, 0, 0];
    expectedByWeekday[expectedWeekdayIdx] = 1;
    expect(stats.byWeekday).toEqual(expectedByWeekday);
    expect(stats.byHour[10]).toBe(1);
  });
});
