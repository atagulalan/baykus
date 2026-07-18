import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { openLibraryDb } from "../db/open.ts";
import * as schema from "../db/schema.ts";
import { exportLibraryZip } from "./export.ts";
import { importLibraryZip } from "./import.ts";

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

/** A reasonably rich library: two items, specials, rewatches, both rating targets. */
function buildPopulatedDb() {
  const { db } = openLibraryDb(":memory:");

  const item1 = db
    .insert(schema.items)
    .values({
      mediaType: "series",
      title: "House of the Dragon",
      originalTitle: null,
      tagline: "Win or die.",
      overview: "Dragons.",
      tmdbId: 94997,
      imdbId: "tt11198330",
      genres: [{ id: 18, name: "Drama" }],
      networks: [{ id: 49, name: "HBO" }],
      contentRatings: [{ region: "US", rating: "TV-MA" }],
      episodeRunTimes: [60],
      addedAt: "2026-01-01T00:00:00Z",
      addedVia: "manual",
      lastRefreshedAt: "2026-01-05T00:00:00Z",
    })
    .returning({ id: schema.items.id })
    .get();
  db.insert(schema.tracking)
    .values({
      itemId: item1.id,
      manualList: null,
      pushMuted: true,
      note: "great show",
      listChangedAt: "2026-01-01T00:00:00Z",
    })
    .run();
  db.insert(schema.seasons).values({ itemId: item1.id, number: 0, name: "Specials" }).run();
  db.insert(schema.seasons).values({ itemId: item1.id, number: 1, name: "Season 1" }).run();
  const special = db
    .insert(schema.episodes)
    .values({ itemId: item1.id, seasonNumber: 0, episodeNumber: 1, title: "Behind the scenes" })
    .returning({ id: schema.episodes.id })
    .get();
  const s1e1 = db
    .insert(schema.episodes)
    .values({
      itemId: item1.id,
      seasonNumber: 1,
      episodeNumber: 1,
      title: "The Heirs of the Dragon",
      airDate: "2022-08-21",
      runtimeMin: 66,
      episodeType: "standard",
    })
    .returning({ id: schema.episodes.id })
    .get();
  const s1e10 = db
    .insert(schema.episodes)
    .values({
      itemId: item1.id,
      seasonNumber: 1,
      episodeNumber: 10,
      title: "The Black Queen",
      airDate: "2022-10-23",
      episodeType: "finale",
    })
    .returning({ id: schema.episodes.id })
    .get();

  // A rewatch — two watch events for the same episode.
  db.insert(schema.watches)
    .values({
      episodeId: s1e1.id,
      itemId: item1.id,
      watchedAt: "2026-01-02T10:00:00Z",
      source: "manual",
    })
    .run();
  db.insert(schema.watches)
    .values({
      episodeId: s1e1.id,
      itemId: item1.id,
      watchedAt: "2026-01-10T20:00:00Z",
      source: "manual",
    })
    .run();
  db.insert(schema.watches)
    .values({
      episodeId: s1e10.id,
      itemId: item1.id,
      watchedAt: "2026-01-15T20:00:00Z",
      source: "bulk",
    })
    .run();
  db.insert(schema.watches)
    .values({
      episodeId: special.id,
      itemId: item1.id,
      watchedAt: "2026-01-16T20:00:00Z",
      source: "manual",
    })
    .run();
  // E95: a TV Time import row with no usable timestamp — watchedAt is an import-run stand-in.
  db.insert(schema.watches)
    .values({
      episodeId: s1e10.id,
      itemId: item1.id,
      watchedAt: "2026-01-20T20:00:00Z",
      source: "import:tvtime",
      dateUnknown: true,
    })
    .run();

  db.insert(schema.ratings)
    .values({ targetType: "item", targetId: item1.id, value: 3, ratedAt: "2026-01-16T00:00:00Z" })
    .run();
  db.insert(schema.ratings)
    .values({ targetType: "episode", targetId: s1e1.id, value: 2, ratedAt: "2026-01-02T11:00:00Z" })
    .run();
  db.insert(schema.ratings)
    .values({
      targetType: "episode",
      targetId: s1e10.id,
      value: 1,
      ratedAt: "2026-01-15T21:00:00Z",
    })
    .run();

  const item2 = db
    .insert(schema.items)
    .values({
      mediaType: "series",
      title: "Breaking Bad",
      tvmazeId: 169,
      addedAt: "2026-01-03T00:00:00Z",
      addedVia: "import:tvtime",
      lastRefreshedAt: "2026-01-03T00:00:00Z",
    })
    .returning({ id: schema.items.id })
    .get();
  db.insert(schema.tracking)
    .values({
      itemId: item2.id,
      manualList: "watch_later",
      pushMuted: false,
      note: null,
      listChangedAt: "2026-01-03T00:00:00Z",
      favorite: true,
    })
    .run();

  // Third item: manualList "stopped", with zero watches (not_started, never "finished") so
  // the E26 cleanup never touches it — a "stopped" item that WAS finished isn't round-trip-safe,
  // reimporting would clear it and break the byte-identical assertion.
  const item3 = db
    .insert(schema.items)
    .values({
      mediaType: "series",
      title: "The Wire",
      tvdbId: 79126,
      addedAt: "2026-01-04T00:00:00Z",
      addedVia: "import:zip",
      lastRefreshedAt: "2026-01-04T00:00:00Z",
    })
    .returning({ id: schema.items.id })
    .get();
  db.insert(schema.tracking)
    .values({
      itemId: item3.id,
      manualList: "stopped",
      pushMuted: false,
      note: null,
      listChangedAt: "2026-01-04T00:00:00Z",
    })
    .run();
  db.insert(schema.seasons).values({ itemId: item3.id, number: 1, name: "Season 1" }).run();
  db.insert(schema.episodes)
    .values({
      itemId: item3.id,
      seasonNumber: 1,
      episodeNumber: 1,
      title: "The Target",
      airDate: "2002-06-02",
    })
    .run();

  db.insert(schema.settings).values({ key: "locale", value: "tr" }).run();
  db.insert(schema.settings).values({ key: "region", value: "TR" }).run();
  db.insert(schema.settings).values({ key: "scrapers_enabled", value: "0" }).run();

  return { db };
}

describe("round-trip invariant (Article III — NEVER weaken this test)", () => {
  it("export -> import(empty) -> export is byte-identical", async () => {
    const { db: sourceDb } = buildPopulatedDb();
    const now = "2026-02-01T00:00:00Z";

    const firstZip = await streamToBuffer(exportLibraryZip(sourceDb, { now }));

    const { db: targetDb } = openLibraryDb(":memory:");
    const importResult = await importLibraryZip(targetDb, firstZip, "replace");
    expect(importResult.warnings).toEqual([]);

    const secondZip = await streamToBuffer(exportLibraryZip(targetDb, { now }));

    expect(secondZip.equals(firstZip)).toBe(true);
  });

  it("round-trips through merge mode into an empty library too", async () => {
    const { db: sourceDb } = buildPopulatedDb();
    const now = "2026-02-01T00:00:00Z";

    const firstZip = await streamToBuffer(exportLibraryZip(sourceDb, { now }));

    const { db: targetDb } = openLibraryDb(":memory:");
    await importLibraryZip(targetDb, firstZip, "merge");

    const secondZip = await streamToBuffer(exportLibraryZip(targetDb, { now }));

    expect(secondZip.equals(firstZip)).toBe(true);
  });

  it("round-trips secrets when includeSecrets is used symmetrically", async () => {
    const { db: sourceDb } = buildPopulatedDb();
    sourceDb.insert(schema.settings).values({ key: "tmdb_api_key", value: "super-secret" }).run();
    const now = "2026-02-01T00:00:00Z";

    const firstZip = await streamToBuffer(
      exportLibraryZip(sourceDb, { now, includeSecrets: true }),
    );
    const { db: targetDb } = openLibraryDb(":memory:");
    await importLibraryZip(targetDb, firstZip, "replace");
    const secondZip = await streamToBuffer(
      exportLibraryZip(targetDb, { now, includeSecrets: true }),
    );

    expect(secondZip.equals(firstZip)).toBe(true);
  });

  // WP4: the profile banner (a `settings` key) and uploaded avatar (the new
  // profile_media BLOB table) must round-trip too — added, not weakening any
  // existing assertion above.
  it("round-trips the WP4 banner + avatar (byte-identical, replace mode)", async () => {
    const { db: sourceDb } = buildPopulatedDb();
    sourceDb.insert(schema.settings).values({ key: "banner_ref", value: "tmdb:/abc123.jpg" }).run();
    sourceDb
      .insert(schema.profileMedia)
      .values({
        kind: "avatar",
        mimeType: "image/png",
        data: Buffer.from("fake-png-bytes"),
        updatedAt: "2026-01-20T00:00:00Z",
      })
      .run();
    const now = "2026-02-01T00:00:00Z";

    const firstZip = await streamToBuffer(exportLibraryZip(sourceDb, { now }));

    const { db: targetDb } = openLibraryDb(":memory:");
    const importResult = await importLibraryZip(targetDb, firstZip, "replace");
    expect(importResult.warnings).toEqual([]);

    // The photo bytes themselves must have actually made it across (not just
    // the zip bytes matching) — the exported JSON omits `updatedAt`
    // (ephemeral cache-bust metadata, not portable data), so this checks the
    // part that IS meant to be portable.
    const imported = targetDb
      .select({ mimeType: schema.profileMedia.mimeType, data: schema.profileMedia.data })
      .from(schema.profileMedia)
      .where(eq(schema.profileMedia.kind, "avatar"))
      .get();
    expect(imported).toEqual({ mimeType: "image/png", data: Buffer.from("fake-png-bytes") });

    const secondZip = await streamToBuffer(exportLibraryZip(targetDb, { now }));
    expect(secondZip.equals(firstZip)).toBe(true);
  });
});
