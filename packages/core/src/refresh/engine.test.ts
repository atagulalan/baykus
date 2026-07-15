import type { MetadataProvider, SeriesDetails } from "@baykus/provider-sdk";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { LibraryDatabase } from "../db/open.ts";
import { openLibraryDb } from "../db/open.ts";
import * as schema from "../db/schema.ts";
import { refreshAll, refreshItem } from "./engine.ts";

function addDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

let nextTvmazeId = 1;

function setupItem(db: LibraryDatabase, lastRefreshedAt: string): number {
  const item = db
    .insert(schema.items)
    .values({
      mediaType: "series",
      title: "Old Title",
      tvmazeId: nextTvmazeId++,
      lastRefreshedAt,
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
  airDate: string | null,
  title = "Old",
): number {
  return db
    .insert(schema.episodes)
    .values({ itemId, seasonNumber, episodeNumber, airDate, title })
    .returning({ id: schema.episodes.id })
    .get().id;
}

function fakeProvider(
  impl: (ids: unknown) => Promise<SeriesDetails> | SeriesDetails,
): MetadataProvider {
  return {
    id: "fake",
    mediaTypes: ["series"],
    capabilities: {
      search: true,
      details: true,
      upcoming: true,
      watchProviders: false,
      externalRatings: false,
      tags: false,
      images: true,
    },
    requiresApiKey: false,
    async search() {
      return [];
    },
    async getSeriesDetails(ref) {
      return impl(ref);
    },
    resolveImageUrl() {
      return "";
    },
  };
}

function details(
  seasons: SeriesDetails["seasons"],
  overrides: Partial<SeriesDetails> = {},
): SeriesDetails {
  return {
    providerId: "fake",
    mediaType: "series",
    externalIds: { tvmazeId: 1 },
    title: "New Title",
    seasons,
    ...overrides,
  };
}

describe("refreshItem", () => {
  it("updates item-level fields from the fresh details", async () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "2026-01-01T00:00:00Z");

    await refreshItem(
      db,
      fakeProvider(() => details([])),
      itemId,
      "2026-01-02T00:00:00Z",
    );

    const item = db.select().from(schema.items).where(eq(schema.items.id, itemId)).get();
    expect(item?.title).toBe("New Title");
    expect(item?.lastRefreshedAt).toBe("2026-01-02T00:00:00Z");
  });

  it("inserts a new episode and updates a matched one (air date changed)", async () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "2026-01-01T00:00:00Z");
    const existingId = insertEpisode(db, itemId, 1, 1, addDays(-10), "Pilot (old)");

    const provider = fakeProvider(() =>
      details([
        {
          number: 1,
          episodes: [
            { seasonNumber: 1, episodeNumber: 1, title: "Pilot (new)", airDate: addDays(-9) },
            { seasonNumber: 1, episodeNumber: 2, title: "Ep2", airDate: addDays(-8) },
          ],
        },
      ]),
    );

    await refreshItem(db, provider, itemId, "2026-01-02T00:00:00Z");

    const episodes = db
      .select()
      .from(schema.episodes)
      .where(eq(schema.episodes.itemId, itemId))
      .all();
    expect(episodes).toHaveLength(2);
    const e1 = episodes.find((e) => e.episodeNumber === 1);
    expect(e1?.id).toBe(existingId); // same row, updated in place
    expect(e1?.title).toBe("Pilot (new)");
    expect(e1?.airDate).toBe(addDays(-9));
    const e2 = episodes.find((e) => e.episodeNumber === 2);
    expect(e2?.title).toBe("Ep2");
  });

  it("deletes an unwatched orphan episode (E11/E12)", async () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "2026-01-01T00:00:00Z");
    insertEpisode(db, itemId, 1, 1, addDays(-10));

    const provider = fakeProvider(() => details([{ number: 1, episodes: [] }]));
    await refreshItem(db, provider, itemId, "2026-01-02T00:00:00Z");

    const episodes = db
      .select()
      .from(schema.episodes)
      .where(eq(schema.episodes.itemId, itemId))
      .all();
    expect(episodes).toHaveLength(0);
  });

  it("keeps a watched orphan episode with its watches (E11)", async () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "2026-01-01T00:00:00Z");
    const epId = insertEpisode(db, itemId, 1, 1, addDays(-10));
    db.insert(schema.watches)
      .values({ episodeId: epId, itemId, watchedAt: "2026-01-01T12:00:00Z", source: "manual" })
      .run();

    const provider = fakeProvider(() => details([{ number: 1, episodes: [] }]));
    await refreshItem(db, provider, itemId, "2026-01-02T00:00:00Z");

    const episodes = db
      .select()
      .from(schema.episodes)
      .where(eq(schema.episodes.itemId, itemId))
      .all();
    expect(episodes).toHaveLength(1);
    expect(episodes[0]?.id).toBe(epId);
    const watches = db
      .select()
      .from(schema.watches)
      .where(eq(schema.watches.episodeId, epId))
      .all();
    expect(watches).toHaveLength(1);
  });

  it("newEpisodes counts only episodes newly aired since the last refresh", async () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "2026-01-01T00:00:00Z");

    const provider = fakeProvider(() =>
      details([
        {
          number: 1,
          episodes: [
            { seasonNumber: 1, episodeNumber: 1, airDate: "2025-12-01" }, // before last refresh
            { seasonNumber: 1, episodeNumber: 2, airDate: "2026-01-05" }, // newly aired
            { seasonNumber: 1, episodeNumber: 3, airDate: "2026-01-10" }, // in the future (now=01-08)
          ],
        },
      ]),
    );

    const result = await refreshItem(db, provider, itemId, "2026-01-08T00:00:00Z");
    expect(result.newEpisodes).toBe(1);
  });

  it("writes a refresh_log row on success", async () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "2026-01-01T00:00:00Z");

    await refreshItem(
      db,
      fakeProvider(() => details([])),
      itemId,
      "2026-01-02T00:00:00Z",
    );

    const logs = db
      .select()
      .from(schema.refreshLog)
      .where(eq(schema.refreshLog.itemId, itemId))
      .all();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ ok: true, newEpisodeCount: 0 });
  });

  it("a provider failure throws and writes a failed refresh_log row", async () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = setupItem(db, "2026-01-01T00:00:00Z");
    const provider = fakeProvider(() => {
      throw new Error("boom");
    });

    await expect(refreshItem(db, provider, itemId, "2026-01-02T00:00:00Z")).rejects.toThrow("boom");

    const logs = db
      .select()
      .from(schema.refreshLog)
      .where(eq(schema.refreshLog.itemId, itemId))
      .all();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ ok: false, error: "boom" });
  });

  it("throws for an unknown item", async () => {
    const { db } = openLibraryDb(":memory:");
    await expect(
      refreshItem(
        db,
        fakeProvider(() => details([])),
        999,
      ),
    ).rejects.toThrow();
  });
});

describe("refreshAll", () => {
  it("yields a result per item; one failure never aborts the run", async () => {
    const { db } = openLibraryDb(":memory:");
    const ok1 = setupItem(db, "2026-01-01T00:00:00Z");
    const broken = setupItem(db, "2026-01-01T00:00:00Z");
    const ok2 = setupItem(db, "2026-01-01T00:00:00Z");

    const provider = fakeProvider((ref) => {
      const ids = ref as { tvmazeId?: number };
      if (ids.tvmazeId === undefined) throw new Error("no id");
      return details([]);
    });
    // Make the "broken" item fail by giving it no resolvable id.
    db.update(schema.items).set({ tvmazeId: null }).where(eq(schema.items.id, broken)).run();

    const results = [];
    for await (const result of refreshAll(db, provider, [ok1, broken, ok2], 3)) {
      results.push(result);
    }

    expect(results).toHaveLength(3);
    const byId = new Map(results.map((r) => [r.itemId, r]));
    expect(byId.get(ok1)?.ok).toBe(true);
    expect(byId.get(ok2)?.ok).toBe(true);
    expect(byId.get(broken)?.ok).toBe(false);
  });

  it("respects the concurrency cap by batching", async () => {
    const { db } = openLibraryDb(":memory:");
    const ids = [setupItem(db, "2026-01-01T00:00:00Z"), setupItem(db, "2026-01-01T00:00:00Z")];
    let maxInFlight = 0;
    let inFlight = 0;
    const provider = fakeProvider(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return details([]);
    });

    const results = [];
    for await (const result of refreshAll(db, provider, ids, 1)) {
      results.push(result);
    }

    expect(results).toHaveLength(2);
    expect(maxInFlight).toBe(1);
  });
});
