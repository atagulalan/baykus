import { ZipArchive } from "archiver";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { LibraryDatabase } from "../db/open.ts";
import { openLibraryDb } from "../db/open.ts";
import * as schema from "../db/schema.ts";
import { exportLibraryZip } from "./export.ts";
import { importLibraryZip, ZipImportError } from "./import.ts";

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

/** A real zip with just a (possibly malformed) manifest.json — no library/*.json entries. */
async function manifestOnlyZip(overrides: Record<string, unknown> = {}): Promise<Buffer> {
  const manifest = JSON.stringify({
    app: "baykus",
    schemaVersion: 1,
    exportedAt: "2026-01-01T00:00:00Z",
    appVersion: "0.1.0",
    mediaTypes: ["series"],
    counts: { items: 0, watches: 0, ratings: 0 },
    ...overrides,
  });
  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.append(manifest, { name: "manifest.json" });
  void archive.finalize();
  return streamToBuffer(archive);
}

function setupOneItem(title: string, tmdbId: number) {
  const { db } = openLibraryDb(":memory:");
  const item = db
    .insert(schema.items)
    .values({
      mediaType: "series",
      title,
      tmdbId,
      addedAt: "2026-01-01T00:00:00Z",
      lastRefreshedAt: "2026-01-01T00:00:00Z",
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
  const ep = db
    .insert(schema.episodes)
    .values({
      itemId: item.id,
      seasonNumber: 1,
      episodeNumber: 1,
      title: "Pilot",
      airDate: "2026-01-01",
    })
    .returning({ id: schema.episodes.id })
    .get();
  return { db, itemId: item.id, episodeId: ep.id };
}

describe("importLibraryZip — schema validation", () => {
  it("rejects an unsupported schemaVersion (3)", async () => {
    const { db } = openLibraryDb(":memory:");
    const badZip = await manifestOnlyZip({ schemaVersion: 3 });

    await expect(importLibraryZip(db, badZip, "replace")).rejects.toMatchObject({
      code: "UNSUPPORTED_SCHEMA",
    });
    await expect(importLibraryZip(db, badZip, "replace")).rejects.toBeInstanceOf(ZipImportError);
  });

  it("rejects a zip that isn't a real zip file", async () => {
    const { db } = openLibraryDb(":memory:");
    await expect(importLibraryZip(db, Buffer.from("not a zip"), "replace")).rejects.toMatchObject({
      code: "BAD_MANIFEST",
    });
  });

  it("rejects an empty buffer (no manifest.json, not even a valid zip)", async () => {
    const { db } = openLibraryDb(":memory:");
    await expect(importLibraryZip(db, Buffer.alloc(0), "replace")).rejects.toMatchObject({
      code: "BAD_MANIFEST",
    });
  });

  it("rejects a manifest missing required fields", async () => {
    const { db } = openLibraryDb(":memory:");
    const badZip = await manifestOnlyZip({ app: "not-baykus" });
    await expect(importLibraryZip(db, badZip, "replace")).rejects.toMatchObject({
      code: "BAD_MANIFEST",
    });
  });
});

describe("importLibraryZip — merge mode", () => {
  it("union: importing a second library's export adds its items alongside existing ones", async () => {
    const { db: libA } = setupOneItem("Show A", 1);

    const { db: libB } = setupOneItem("Show B", 2);
    const zipB = await streamToBuffer(exportLibraryZip(libB));

    await importLibraryZip(libA, zipB, "merge");

    const items = libA.select().from(schema.items).all();
    expect(items.map((i) => i.title).sort()).toEqual(["Show A", "Show B"]);
  });

  it("idempotency: importing the exact same zip twice never duplicates items or watches", async () => {
    const { db, itemId, episodeId } = setupOneItem("Show A", 1);
    db.insert(schema.watches)
      .values({ episodeId, itemId, watchedAt: "2026-01-02T00:00:00Z", source: "manual" })
      .run();
    const zip = await streamToBuffer(exportLibraryZip(db));

    await importLibraryZip(db, zip, "merge");
    await importLibraryZip(db, zip, "merge");

    expect(db.select().from(schema.items).all()).toHaveLength(1);
    expect(db.select().from(schema.watches).all()).toHaveLength(1);
  });

  it("duplicate watch (episode, timestamp) is skipped and reported as a warning", async () => {
    const { db, itemId, episodeId } = setupOneItem("Show A", 1);
    db.insert(schema.watches)
      .values({ episodeId, itemId, watchedAt: "2026-01-02T00:00:00Z", source: "manual" })
      .run();
    const zip = await streamToBuffer(exportLibraryZip(db));

    const result = await importLibraryZip(db, zip, "merge");

    expect(result.warnings.some((w) => w.includes("duplicate"))).toBe(true);
  });

  it("ratings: incoming wins on conflict", async () => {
    const { db, itemId } = setupOneItem("Show A", 1);
    db.insert(schema.ratings)
      .values({ targetType: "item", targetId: itemId, value: 1, ratedAt: "2026-01-01T00:00:00Z" })
      .run();
    const zip = await streamToBuffer(exportLibraryZip(db));

    // Re-rate locally after the export was taken, then merge the (now stale) zip back in.
    db.update(schema.ratings).set({ value: 2 }).where(eq(schema.ratings.targetId, itemId)).run();

    await importLibraryZip(db, zip, "merge");

    const rating = db
      .select()
      .from(schema.ratings)
      .where(eq(schema.ratings.targetId, itemId))
      .get();
    expect(rating?.value).toBe(1); // the zip's (incoming) value won
  });

  it("item metadata: the side with the newer lastRefreshedAt wins wholesale", async () => {
    const { db: libA } = setupOneItem("Old Title", 1);
    const zipOld = await streamToBuffer(exportLibraryZip(libA));

    const { db: libB } = openLibraryDb(":memory:");
    const item = libB
      .insert(schema.items)
      .values({
        mediaType: "series",
        title: "New Title",
        tmdbId: 1,
        addedAt: "2026-01-01T00:00:00Z",
        lastRefreshedAt: "2026-02-01T00:00:00Z",
      })
      .returning({ id: schema.items.id })
      .get();
    libB
      .insert(schema.tracking)
      .values({
        itemId: item.id,
        manualList: null,
        pushMuted: false,
        note: null,
        listChangedAt: "2026-01-01T00:00:00Z",
      })
      .run();

    await importLibraryZip(libB, zipOld, "merge");

    const merged = libB.select().from(schema.items).where(eq(schema.items.id, item.id)).get();
    expect(merged?.title).toBe("New Title"); // libB's newer metadata wins — the older zip loses
  });

  it("tracking manualList/note: incoming always wins regardless of lastRefreshedAt", async () => {
    const { db, itemId } = setupOneItem("Show A", 1);
    const zip = await streamToBuffer(exportLibraryZip(db)); // manualList null, note null

    db.update(schema.tracking)
      .set({ manualList: "watch_later", note: "finished it" })
      .where(eq(schema.tracking.itemId, itemId))
      .run();

    await importLibraryZip(db, zip, "merge");

    const tracking = db
      .select()
      .from(schema.tracking)
      .where(eq(schema.tracking.itemId, itemId))
      .get();
    expect(tracking?.manualList).toBeNull();
    expect(tracking?.note).toBeNull();
  });
});

/** Hand-builds a v1 zip (legacy {status, statusChangedAt} tracking blocks) to exercise the E26 mapping. */
async function buildV1Zip(
  items: Array<{
    tmdbId: number;
    title: string;
    status: string;
    seasons?: unknown[];
  }>,
  watches: Array<{ tmdbId: number; s: number; e: number; watchedAt: string }> = [],
): Promise<Buffer> {
  const manifest = {
    app: "baykus",
    schemaVersion: 1,
    exportedAt: "2026-01-01T00:00:00Z",
    appVersion: "0.1.0",
    mediaTypes: ["series"],
    counts: { items: items.length, watches: watches.length, ratings: 0 },
  };
  const itemEntries = items.map((it) => ({
    mediaType: "series",
    title: it.title,
    externalIds: { tmdbId: it.tmdbId },
    tracking: {
      status: it.status,
      pushMuted: false,
      note: null,
      statusChangedAt: "2026-01-01T00:00:00Z",
    },
    metadata: {
      originalTitle: null,
      overview: null,
      tagline: null,
      releaseStatus: null,
      firstAirDate: null,
      lastAirDate: null,
      originCountry: null,
      originalLanguage: null,
      episodeRunTimes: null,
      networks: null,
      genres: null,
      tags: null,
      contentRatings: null,
      posterRef: null,
      backdropRef: null,
      logoRef: null,
      watchProviders: null,
      externalRatings: null,
      seasons: it.seasons ?? [],
    },
    addedAt: "2026-01-01T00:00:00Z",
    lastRefreshedAt: null,
  }));
  const watchEntries = watches.map((w) => ({
    series: { tmdbId: w.tmdbId },
    s: w.s,
    e: w.e,
    watchedAt: w.watchedAt,
    source: "import:zip",
  }));

  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.append(JSON.stringify(manifest), { name: "manifest.json" });
  archive.append(JSON.stringify(itemEntries), { name: "library/items.json" });
  archive.append(JSON.stringify(watchEntries), { name: "library/watches.json" });
  archive.append(JSON.stringify([]), { name: "library/ratings.json" });
  archive.append(JSON.stringify({}), { name: "library/settings.json" });
  void archive.finalize();
  return streamToBuffer(archive);
}

function manualListByTmdbId(db: LibraryDatabase) {
  const rows = db
    .select({ tmdbId: schema.items.tmdbId, manualList: schema.tracking.manualList })
    .from(schema.items)
    .innerJoin(schema.tracking, eq(schema.tracking.itemId, schema.items.id))
    .all();
  return new Map(rows.map((r) => [r.tmdbId, r.manualList]));
}

describe("importLibraryZip — v1 import (E26)", () => {
  it("maps all five legacy statuses to their v2 manualList", async () => {
    const { db } = openLibraryDb(":memory:");
    const zip = await buildV1Zip([
      { tmdbId: 1, title: "Plan", status: "plan_to_watch" },
      { tmdbId: 2, title: "Dropped", status: "dropped" },
      { tmdbId: 3, title: "Watching", status: "watching" },
      { tmdbId: 4, title: "Completed", status: "completed" },
      { tmdbId: 5, title: "Paused", status: "paused" },
    ]);

    await importLibraryZip(db, zip, "replace");
    const byTmdbId = manualListByTmdbId(db);

    expect(byTmdbId.get(1)).toBe("watch_later");
    expect(byTmdbId.get(2)).toBe("stopped");
    expect(byTmdbId.get(3)).toBeNull();
    expect(byTmdbId.get(4)).toBeNull();
    expect(byTmdbId.get(5)).toBeNull();
  });

  it("dropped + all aired episodes watched → manual_list cleared by the E26 cleanup", async () => {
    const { db } = openLibraryDb(":memory:");
    const zip = await buildV1Zip(
      [
        {
          tmdbId: 6,
          title: "Finished But Dropped",
          status: "dropped",
          seasons: [
            {
              number: 1,
              name: null,
              overview: null,
              posterRef: null,
              airDate: null,
              episodes: [
                {
                  s: 1,
                  e: 1,
                  title: "Pilot",
                  overview: null,
                  airDate: "2020-01-01",
                  runtimeMin: null,
                  type: null,
                  stillRef: null,
                  externalRatings: null,
                },
              ],
            },
          ],
        },
      ],
      [{ tmdbId: 6, s: 1, e: 1, watchedAt: "2026-01-02T00:00:00Z" }],
    );

    await importLibraryZip(db, zip, "replace");

    expect(manualListByTmdbId(db).get(6)).toBeNull();
  });

  it("dropped + zero watches stays stopped (not_started is not finished)", async () => {
    const { db } = openLibraryDb(":memory:");
    const zip = await buildV1Zip([{ tmdbId: 7, title: "Dropped, untouched", status: "dropped" }]);

    await importLibraryZip(db, zip, "replace");

    expect(manualListByTmdbId(db).get(7)).toBe("stopped");
  });
});

describe("importLibraryZip — replace mode", () => {
  it("wipes existing data before loading the zip", async () => {
    const { db: libA } = setupOneItem("Show A", 1);
    const zipA = await streamToBuffer(exportLibraryZip(libA));

    const { db: libB } = setupOneItem("Show B", 2);
    await importLibraryZip(libB, zipA, "replace");

    const items = libB.select().from(schema.items).all();
    expect(items.map((i) => i.title)).toEqual(["Show A"]);
  });
});
