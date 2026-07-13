import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { LibraryDatabase } from "../db/open.ts";
import { openLibraryDb } from "../db/open.ts";
import type { TrackingStatus } from "../db/schema.ts";
import * as schema from "../db/schema.ts";
import { addWatch, bulkWatch, removeLatestWatch, suggestCompleted } from "./watches.ts";

function addDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function setupItem(db: LibraryDatabase, status: TrackingStatus = "watching"): number {
  const item = db
    .insert(schema.items)
    .values({ mediaType: "series", title: "Test Show", addedAt: "2026-01-01T00:00:00Z" })
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
): number {
  return db
    .insert(schema.episodes)
    .values({ itemId, seasonNumber, episodeNumber, airDate })
    .returning({ id: schema.episodes.id })
    .get().id;
}

function watchesFor(db: LibraryDatabase, episodeId: number) {
  return db.select().from(schema.watches).where(eq(schema.watches.episodeId, episodeId)).all();
}

describe("addWatch", () => {
  it("rewatch creates a second watch event", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db);
    const epId = insertEpisode(db, itemId, 1, 1, addDays(-10));

    const first = addWatch(db, epId, "2026-01-01T10:00:00Z");
    const second = addWatch(db, epId, "2026-01-02T10:00:00Z");

    expect(first?.created).toBe(true);
    expect(second?.created).toBe(true);
    expect(first?.id).not.toBe(second?.id);
    expect(watchesFor(db, epId)).toHaveLength(2);
  });

  it("duplicate (episodeId, watchedAt) is idempotent — E6", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db);
    const epId = insertEpisode(db, itemId, 1, 1, addDays(-10));

    const first = addWatch(db, epId, "2026-01-01T10:00:00Z");
    const duplicate = addWatch(db, epId, "2026-01-01T10:00:00Z");

    expect(duplicate?.created).toBe(false);
    expect(duplicate?.id).toBe(first?.id);
    expect(watchesFor(db, epId)).toHaveLength(1);
  });

  it("returns null for an unknown episode", () => {
    const { db } = openLibraryDb(":memory:");
    expect(addWatch(db, 999, "2026-01-01T00:00:00Z")).toBeNull();
  });
});

describe("removeLatestWatch", () => {
  it("unmark removes newest only (E5)", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db);
    const epId = insertEpisode(db, itemId, 1, 1, addDays(-10));
    addWatch(db, epId, "2026-01-01T10:00:00Z");
    const second = addWatch(db, epId, "2026-01-05T10:00:00Z");

    expect(removeLatestWatch(db, epId)).toBe(true);

    const remaining = watchesFor(db, epId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.watchedAt).toBe("2026-01-01T10:00:00Z");
    expect(remaining.some((w) => w.id === second?.id)).toBe(false);
  });

  it("returns false when there is nothing to remove", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db);
    const epId = insertEpisode(db, itemId, 1, 1, addDays(-10));
    expect(removeLatestWatch(db, epId)).toBe(false);
  });
});

describe("bulkWatch", () => {
  it("upToEpisodeId skips specials and already-watched episodes (E2)", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db);
    const special = insertEpisode(db, itemId, 0, 1, addDays(-20));
    const e1 = insertEpisode(db, itemId, 1, 1, addDays(-10));
    const e2 = insertEpisode(db, itemId, 1, 2, addDays(-9));
    const e3 = insertEpisode(db, itemId, 1, 3, addDays(-8));

    addWatch(db, e1, "2026-01-01T00:00:00Z");

    const result = bulkWatch(db, itemId, { upToEpisodeId: e3 });

    expect(result).toMatchObject({ created: 2, skippedAlreadyWatched: 1 });
    expect(watchesFor(db, special)).toHaveLength(0);
    expect(watchesFor(db, e2)).toHaveLength(1);
    expect(watchesFor(db, e3)).toHaveLength(1);
  });

  it("seasonNumber mode includes specials when season 0 is targeted explicitly", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db);
    const special = insertEpisode(db, itemId, 0, 1, addDays(-10));

    const result = bulkWatch(db, itemId, { seasonNumber: 0 });

    expect(result).toMatchObject({ created: 1, skippedAlreadyWatched: 0 });
    expect(watchesFor(db, special)).toHaveLength(1);
  });

  it("never auto-watches unaired (future) episodes", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db);
    const e1 = insertEpisode(db, itemId, 1, 1, addDays(-10));
    const future = insertEpisode(db, itemId, 1, 2, addDays(10));

    const result = bulkWatch(db, itemId, { seasonNumber: 1 });

    expect(result).toMatchObject({ created: 1, skippedAlreadyWatched: 0 });
    expect(watchesFor(db, future)).toHaveLength(0);
    expect(watchesFor(db, e1)).toHaveLength(1);
  });

  it("returns null for an unknown item or an unknown boundary episode", () => {
    const { db } = openLibraryDb(":memory:");
    expect(bulkWatch(db, 999, { seasonNumber: 1 })).toBeNull();

    const itemId = setupItem(db);
    expect(bulkWatch(db, itemId, { upToEpisodeId: 999 })).toBeNull();
  });
});

describe("suggestCompleted", () => {
  it("flips to true exactly when the last aired episode is watched", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db);
    const e1 = insertEpisode(db, itemId, 1, 1, addDays(-10));
    const e2 = insertEpisode(db, itemId, 1, 2, addDays(-5));

    expect(suggestCompleted(db, itemId)).toBe(false);

    addWatch(db, e1, "2026-01-01T00:00:00Z");
    expect(suggestCompleted(db, itemId)).toBe(false);

    const result = addWatch(db, e2, "2026-01-02T00:00:00Z");
    expect(suggestCompleted(db, itemId)).toBe(true);
    expect(result?.suggestCompleted).toBe(true);
  });

  it("is false once status is already completed", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "completed");
    const e1 = insertEpisode(db, itemId, 1, 1, addDays(-10));
    addWatch(db, e1, "2026-01-01T00:00:00Z");

    expect(suggestCompleted(db, itemId)).toBe(false);
  });

  it("is false when nothing has aired yet", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db);
    insertEpisode(db, itemId, 1, 1, addDays(5));

    expect(suggestCompleted(db, itemId)).toBe(false);
  });

  it("ignores unwatched future episodes — they never block or require watching", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db);
    const e1 = insertEpisode(db, itemId, 1, 1, addDays(-10));
    insertEpisode(db, itemId, 1, 2, addDays(10));

    addWatch(db, e1, "2026-01-01T00:00:00Z");
    expect(suggestCompleted(db, itemId)).toBe(true);
  });
});
