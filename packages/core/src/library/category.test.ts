import type { ReleaseStatus } from "@baykus/provider-sdk";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { LibraryDatabase } from "../db/open.ts";
import { openLibraryDb } from "../db/open.ts";
import type { ManualList, WatchSource } from "../db/schema.ts";
import * as schema from "../db/schema.ts";
import {
  CATEGORY_ORDER,
  computeCategories,
  computeCategory,
  computeDynamicCategory,
  WATCHING_WINDOW_DAYS,
} from "./category.ts";

function insertItem(db: LibraryDatabase, releaseStatus: ReleaseStatus | null = null): number {
  const id = db
    .insert(schema.items)
    .values({
      mediaType: "series",
      title: "Test Show",
      releaseStatus,
      addedAt: "2026-01-01T00:00:00Z",
    })
    .returning({ id: schema.items.id })
    .get().id;
  db.insert(schema.tracking)
    .values({
      itemId: id,
      manualList: null,
      pushMuted: false,
      note: null,
      listChangedAt: "2026-01-01T00:00:00Z",
    })
    .run();
  return id;
}

function setManualList(db: LibraryDatabase, itemId: number, manualList: ManualList | null): void {
  db.update(schema.tracking)
    .set({ manualList, listChangedAt: "2026-01-01T00:00:00Z" })
    .where(eq(schema.tracking.itemId, itemId))
    .run();
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

function insertWatch(
  db: LibraryDatabase,
  episodeId: number,
  itemId: number,
  watchedAt: string,
  source: WatchSource = "manual",
): void {
  db.insert(schema.watches).values({ episodeId, itemId, watchedAt, source }).run();
}

function daysAgoIso(now: Date, days: number): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
}

function dateOnly(iso: string, offsetDays: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const NOW = new Date("2026-07-15T12:00:00Z");

describe("computeCategory — E16 precedence", () => {
  it("rung 1: manual_list=watch_later wins over everything, incl. not_started", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    setManualList(db, itemId, "watch_later");
    insertEpisode(db, itemId, 1, 1, dateOnly(NOW.toISOString(), -1));

    expect(computeCategory(db, itemId, NOW)).toBe("watch_later");
  });

  it("rung 2: manual_list=stopped wins over a dynamic finished/watching result", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "ended");
    setManualList(db, itemId, "stopped");
    const e1 = insertEpisode(db, itemId, 1, 1, dateOnly(NOW.toISOString(), -1));
    insertWatch(db, e1, itemId, daysAgoIso(NOW, 1));

    expect(computeCategory(db, itemId, NOW)).toBe("stopped");
  });

  it("rung 3: not_started when there are zero non-special watch events", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    insertEpisode(db, itemId, 1, 1, dateOnly(NOW.toISOString(), -1));
    insertEpisode(db, itemId, 1, 2, dateOnly(NOW.toISOString(), 5));

    expect(computeCategory(db, itemId, NOW)).toBe("not_started");
  });

  it("rung 4: finished when every aired episode is watched and releaseStatus is not ongoing", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "ended");
    const e1 = insertEpisode(db, itemId, 1, 1, dateOnly(NOW.toISOString(), -10));
    insertWatch(db, e1, itemId, daysAgoIso(NOW, 5));

    expect(computeCategory(db, itemId, NOW)).toBe("finished");
  });

  it("rung 4: NULL releaseStatus also falls into the finished branch (E18)", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, null);
    const e1 = insertEpisode(db, itemId, 1, 1, dateOnly(NOW.toISOString(), -10));
    insertWatch(db, e1, itemId, daysAgoIso(NOW, 5));

    expect(computeCategory(db, itemId, NOW)).toBe("finished");
  });

  it("rung 5: up_to_date when every aired episode is watched and releaseStatus is ongoing", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "returning");
    const e1 = insertEpisode(db, itemId, 1, 1, dateOnly(NOW.toISOString(), -10));
    insertWatch(db, e1, itemId, daysAgoIso(NOW, 5));

    expect(computeCategory(db, itemId, NOW)).toBe("up_to_date");
  });

  it("in_production also counts as ongoing (up_to_date)", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "in_production");
    const e1 = insertEpisode(db, itemId, 1, 1, dateOnly(NOW.toISOString(), -10));
    insertWatch(db, e1, itemId, daysAgoIso(NOW, 5));

    expect(computeCategory(db, itemId, NOW)).toBe("up_to_date");
  });

  it("rung 6: watching when the newest non-special watch is within the 30-day window", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "returning");
    const e1 = insertEpisode(db, itemId, 1, 1, dateOnly(NOW.toISOString(), -20));
    insertEpisode(db, itemId, 1, 2, dateOnly(NOW.toISOString(), -2));
    insertWatch(db, e1, itemId, daysAgoIso(NOW, 10));

    expect(computeCategory(db, itemId, NOW)).toBe("watching");
  });

  it("rung 7: not_watched_recently when the newest watch is outside the 30-day window", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "returning");
    const e1 = insertEpisode(db, itemId, 1, 1, dateOnly(NOW.toISOString(), -60));
    insertEpisode(db, itemId, 1, 2, dateOnly(NOW.toISOString(), -2));
    insertWatch(db, e1, itemId, daysAgoIso(NOW, 45));

    expect(computeCategory(db, itemId, NOW)).toBe("not_watched_recently");
  });
});

describe("computeCategory — E17 30-day window boundary", () => {
  it("exactly 29 days old is still watching", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "returning");
    const e1 = insertEpisode(db, itemId, 1, 1, dateOnly(NOW.toISOString(), -29));
    insertEpisode(db, itemId, 1, 2, dateOnly(NOW.toISOString(), -2));
    insertWatch(db, e1, itemId, daysAgoIso(NOW, 29));

    expect(computeCategory(db, itemId, NOW)).toBe("watching");
  });

  it(`exactly ${WATCHING_WINDOW_DAYS} days old is still watching (inclusive per E17)`, () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "returning");
    const e1 = insertEpisode(db, itemId, 1, 1, dateOnly(NOW.toISOString(), -30));
    insertEpisode(db, itemId, 1, 2, dateOnly(NOW.toISOString(), -2));
    insertWatch(db, e1, itemId, daysAgoIso(NOW, WATCHING_WINDOW_DAYS));

    expect(computeCategory(db, itemId, NOW)).toBe("watching");
  });

  it("exactly 31 days old has already drifted to not_watched_recently", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "returning");
    const e1 = insertEpisode(db, itemId, 1, 1, dateOnly(NOW.toISOString(), -31));
    insertEpisode(db, itemId, 1, 2, dateOnly(NOW.toISOString(), -2));
    insertWatch(db, e1, itemId, daysAgoIso(NOW, 31));

    expect(computeCategory(db, itemId, NOW)).toBe("not_watched_recently");
  });
});

describe("computeCategory — specials excluded (E1/E17)", () => {
  it("specials-only watches never count: not_started even with a watched S0 episode", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    const special = insertEpisode(db, itemId, 0, 1, dateOnly(NOW.toISOString(), -1));
    insertWatch(db, special, itemId, daysAgoIso(NOW, 1));

    expect(computeCategory(db, itemId, NOW)).toBe("not_started");
  });

  it("zero aired episodes and zero watches: not_started", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    insertEpisode(db, itemId, 1, 1, dateOnly(NOW.toISOString(), 30));

    expect(computeCategory(db, itemId, NOW)).toBe("not_started");
  });
});

describe("computeCategory — manual list defensively wins over a finished dynamic result", () => {
  it("stopped survives even when dynamic category would be finished (imported data)", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "ended");
    const e1 = insertEpisode(db, itemId, 1, 1, dateOnly(NOW.toISOString(), -10));
    insertWatch(db, e1, itemId, daysAgoIso(NOW, 5));
    setManualList(db, itemId, "stopped");

    expect(computeCategory(db, itemId, NOW)).toBe("stopped");
  });
});

describe("computeDynamicCategory — ignores manual_list (E20, E26)", () => {
  it("returns the dynamic category even when manual_list=stopped", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db, "returning");
    const e1 = insertEpisode(db, itemId, 1, 1, dateOnly(NOW.toISOString(), -10));
    insertEpisode(db, itemId, 1, 2, dateOnly(NOW.toISOString(), -2));
    insertWatch(db, e1, itemId, daysAgoIso(NOW, 5));
    setManualList(db, itemId, "stopped");

    expect(computeCategory(db, itemId, NOW)).toBe("stopped");
    expect(computeDynamicCategory(db, itemId, NOW)).toBe("watching");
  });
});

describe("computeCategories — batch matches per-item on a mixed library", () => {
  it("computes the same category per item as computeCategory, in one grouped pass", () => {
    const { db } = openLibraryDb(":memory:");

    const watchLater = insertItem(db);
    setManualList(db, watchLater, "watch_later");

    const stopped = insertItem(db, "returning");
    setManualList(db, stopped, "stopped");

    const notStarted = insertItem(db);
    insertEpisode(db, notStarted, 1, 1, dateOnly(NOW.toISOString(), -1));

    const upToDate = insertItem(db, "returning");
    const upToDateEp = insertEpisode(db, upToDate, 1, 1, dateOnly(NOW.toISOString(), -10));
    insertWatch(db, upToDateEp, upToDate, daysAgoIso(NOW, 5));

    const finished = insertItem(db, "ended");
    const finishedEp = insertEpisode(db, finished, 1, 1, dateOnly(NOW.toISOString(), -10));
    insertWatch(db, finishedEp, finished, daysAgoIso(NOW, 5));

    const watching = insertItem(db, "returning");
    const watchingEp1 = insertEpisode(db, watching, 1, 1, dateOnly(NOW.toISOString(), -20));
    insertEpisode(db, watching, 1, 2, dateOnly(NOW.toISOString(), -2));
    insertWatch(db, watchingEp1, watching, daysAgoIso(NOW, 10));

    const notWatchedRecently = insertItem(db, "returning");
    const nwrEp1 = insertEpisode(db, notWatchedRecently, 1, 1, dateOnly(NOW.toISOString(), -60));
    insertEpisode(db, notWatchedRecently, 1, 2, dateOnly(NOW.toISOString(), -2));
    insertWatch(db, nwrEp1, notWatchedRecently, daysAgoIso(NOW, 45));

    const allIds = [
      watchLater,
      stopped,
      notStarted,
      upToDate,
      finished,
      watching,
      notWatchedRecently,
    ];
    const batch = computeCategories(db, allIds, NOW);

    expect(batch.get(watchLater)).toBe("watch_later");
    expect(batch.get(stopped)).toBe("stopped");
    expect(batch.get(notStarted)).toBe("not_started");
    expect(batch.get(upToDate)).toBe("up_to_date");
    expect(batch.get(finished)).toBe("finished");
    expect(batch.get(watching)).toBe("watching");
    expect(batch.get(notWatchedRecently)).toBe("not_watched_recently");

    for (const id of allIds) {
      expect(batch.get(id)).toBe(computeCategory(db, id, NOW));
    }

    expect(CATEGORY_ORDER).toEqual([
      "watching",
      "not_watched_recently",
      "not_started",
      "watch_later",
      "up_to_date",
      "finished",
      "stopped",
    ]);
  });
});
