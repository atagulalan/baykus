import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { LibraryDatabase } from "../db/open.ts";
import { openLibraryDb } from "../db/open.ts";
import type { ManualList, WatchSource } from "../db/schema.ts";
import * as schema from "../db/schema.ts";
import { addWatch, bulkWatch, removeLatestWatch } from "./watches.ts";

function addDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function setupItem(db: LibraryDatabase, manualList: ManualList | null = null): number {
  const item = db
    .insert(schema.items)
    .values({ mediaType: "series", title: "Test Show", addedAt: "2026-01-01T00:00:00Z" })
    .returning({ id: schema.items.id })
    .get();
  db.insert(schema.tracking)
    .values({
      itemId: item.id,
      manualList,
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

function manualListOf(db: LibraryDatabase, itemId: number): ManualList | null {
  return (
    db
      .select({ manualList: schema.tracking.manualList })
      .from(schema.tracking)
      .where(eq(schema.tracking.itemId, itemId))
      .get()?.manualList ?? null
  );
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

describe("addWatch — E19 auto-clear", () => {
  it.each<ManualList>([
    "watch_later",
    "stopped",
  ])("a manual-source watch clears manual_list=%s and bumps list_changed_at", (manualList) => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, manualList);
    const epId = insertEpisode(db, itemId, 1, 1, addDays(-10));

    addWatch(db, epId, "2026-01-01T10:00:00Z", "manual");

    const row = db.select().from(schema.tracking).where(eq(schema.tracking.itemId, itemId)).get();
    expect(row?.manualList).toBeNull();
    expect(row?.listChangedAt).not.toBe("2026-01-01T00:00:00Z");
  });

  it.each<WatchSource>([
    "import:tvtime",
    "import:zip",
  ])("a %s watch never clears manual_list", (source) => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "stopped");
    const epId = insertEpisode(db, itemId, 1, 1, addDays(-10));

    addWatch(db, epId, "2026-01-01T10:00:00Z", source);

    expect(manualListOf(db, itemId)).toBe("stopped");
  });

  it("an idempotent replay of an existing watch does not re-trigger the clear", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db);
    const epId = insertEpisode(db, itemId, 1, 1, addDays(-10));
    addWatch(db, epId, "2026-01-01T10:00:00Z", "manual");

    // Set the manual list back after the first watch, then replay the same watch event.
    db.update(schema.tracking)
      .set({ manualList: "stopped", listChangedAt: "2026-02-01T00:00:00Z" })
      .where(eq(schema.tracking.itemId, itemId))
      .run();

    addWatch(db, epId, "2026-01-01T10:00:00Z", "manual");
    expect(manualListOf(db, itemId)).toBe("stopped");
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

describe("bulkWatch — E19 auto-clear", () => {
  it("clears a non-null manual_list when it actually creates a watch", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "watch_later");
    insertEpisode(db, itemId, 1, 1, addDays(-10));

    bulkWatch(db, itemId, { seasonNumber: 1 });

    expect(manualListOf(db, itemId)).toBeNull();
  });

  it("does not touch manual_list when every candidate was already watched", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "stopped");
    const e1 = insertEpisode(db, itemId, 1, 1, addDays(-10));
    addWatch(db, e1, "2026-01-01T00:00:00Z", "import:zip");

    bulkWatch(db, itemId, { seasonNumber: 1 });

    expect(manualListOf(db, itemId)).toBe("stopped");
  });
});
