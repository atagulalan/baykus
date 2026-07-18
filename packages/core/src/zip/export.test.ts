import { describe, expect, it } from "vitest";
import * as yauzl from "yauzl";
import { openLibraryDb } from "../db/open.ts";
import * as schema from "../db/schema.ts";
import { exportLibraryZip } from "./export.ts";
import type {
  ZipItemEntry,
  ZipManifest,
  ZipRatingEntry,
  ZipSettings,
  ZipWatchEntry,
} from "./types.ts";

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

async function readZipEntries(buffer: Buffer): Promise<Record<string, string>> {
  // lazyEntries is required: in non-lazy mode yauzl starts emitting "entry"
  // synchronously on open, before our listeners can be attached, and the
  // events are lost — this is what caused every test here to hang.
  const zipfile = await yauzl.fromBufferPromise(buffer, { lazyEntries: true });
  const out: Record<string, string> = {};
  await new Promise<void>((resolve, reject) => {
    zipfile.on("error", reject);
    zipfile.on("end", resolve);
    zipfile.on("entry", (entry) => {
      zipfile.openReadStream(entry, async (err, stream) => {
        if (err) return reject(err);
        out[entry.fileName] = (await streamToBuffer(stream)).toString("utf-8");
        zipfile.readEntry();
      });
    });
    zipfile.readEntry();
  });
  return out;
}

function setupSeries() {
  const { db } = openLibraryDb(":memory:");
  const item = db
    .insert(schema.items)
    .values({
      mediaType: "series",
      title: "Test Show",
      tmdbId: 42,
      genres: [{ name: "Drama" }],
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
  db.insert(schema.seasons).values({ itemId: item.id, number: 1, name: "Season 1" }).run();
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
  db.insert(schema.watches)
    .values({
      episodeId: ep.id,
      itemId: item.id,
      watchedAt: "2026-01-02T10:00:00Z",
      source: "manual",
    })
    .run();
  db.insert(schema.ratings)
    .values({ targetType: "item", targetId: item.id, value: 3, ratedAt: "2026-01-02T00:00:00Z" })
    .run();
  db.insert(schema.ratings)
    .values({ targetType: "episode", targetId: ep.id, value: 2, ratedAt: "2026-01-02T00:00:00Z" })
    .run();
  db.insert(schema.settings).values({ key: "locale", value: "tr" }).run();
  db.insert(schema.settings).values({ key: "tmdb_api_key", value: "super-secret" }).run();
  return { db, itemId: item.id, episodeId: ep.id };
}

describe("exportLibraryZip", () => {
  it("streams a zip with manifest.json + library/*.json", async () => {
    const { db } = setupSeries();
    const buffer = await streamToBuffer(exportLibraryZip(db, { now: "2026-01-03T00:00:00Z" }));
    const entries = await readZipEntries(buffer);

    expect(Object.keys(entries).sort()).toEqual([
      "library/items.json",
      "library/ratings.json",
      "library/settings.json",
      "library/watches.json",
      "manifest.json",
    ]);
  });

  it("manifest carries correct counts and schemaVersion", async () => {
    const { db } = setupSeries();
    const buffer = await streamToBuffer(exportLibraryZip(db, { now: "2026-01-03T00:00:00Z" }));
    const entries = await readZipEntries(buffer);
    const manifest = JSON.parse(entries["manifest.json"] ?? "{}") as ZipManifest;

    expect(manifest).toMatchObject({
      app: "baykus",
      schemaVersion: 6,
      exportedAt: "2026-01-03T00:00:00Z",
      mediaTypes: ["series"],
      counts: { items: 1, watches: 1, ratings: 2 },
    });
  });

  it("item entry carries externalIds, tracking, and full episode inventory", async () => {
    const { db } = setupSeries();
    const buffer = await streamToBuffer(exportLibraryZip(db, { now: "2026-01-03T00:00:00Z" }));
    const entries = await readZipEntries(buffer);
    const items = JSON.parse(entries["library/items.json"] ?? "[]") as ZipItemEntry[];

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "Test Show",
      externalIds: { tmdbId: 42 },
      tracking: { manualList: null },
      addedVia: "manual",
    });
    expect(items[0]?.metadata.seasons).toEqual([
      {
        number: 1,
        name: "Season 1",
        overview: null,
        posterRef: null,
        airDate: null,
        episodes: [
          {
            s: 1,
            e: 1,
            title: "Pilot",
            overview: null,
            airDate: "2026-01-01",
            runtimeMin: null,
            type: null,
            stillRef: null,
            externalRatings: null,
          },
        ],
      },
    ]);
  });

  it("watch entries reference series by externalIds + (s, e), never internal ids", async () => {
    const { db } = setupSeries();
    const buffer = await streamToBuffer(exportLibraryZip(db, { now: "2026-01-03T00:00:00Z" }));
    const entries = await readZipEntries(buffer);
    const watches = JSON.parse(entries["library/watches.json"] ?? "[]") as ZipWatchEntry[];

    expect(watches).toEqual([
      {
        series: { tmdbId: 42 },
        s: 1,
        e: 1,
        watchedAt: "2026-01-02T10:00:00Z",
        source: "manual",
        dateUnknown: false,
      },
    ]);
  });

  it("rating entries cover both item- and episode-targeted ratings", async () => {
    const { db } = setupSeries();
    const buffer = await streamToBuffer(exportLibraryZip(db, { now: "2026-01-03T00:00:00Z" }));
    const entries = await readZipEntries(buffer);
    const ratings = JSON.parse(entries["library/ratings.json"] ?? "[]") as ZipRatingEntry[];

    expect(ratings).toEqual([
      {
        target: "episode",
        series: { tmdbId: 42 },
        s: 1,
        e: 1,
        value: 2,
        ratedAt: "2026-01-02T00:00:00Z",
      },
      { target: "item", series: { tmdbId: 42 }, value: 3, ratedAt: "2026-01-02T00:00:00Z" },
    ]);
  });

  it("excludes the tmdb_api_key secret by default", async () => {
    const { db } = setupSeries();
    const buffer = await streamToBuffer(exportLibraryZip(db, { now: "2026-01-03T00:00:00Z" }));
    const entries = await readZipEntries(buffer);
    const settings = JSON.parse(entries["library/settings.json"] ?? "{}") as ZipSettings;

    expect(settings).toEqual({ locale: "tr" });
  });

  it("includes the secret when includeSecrets is set", async () => {
    const { db } = setupSeries();
    const buffer = await streamToBuffer(
      exportLibraryZip(db, { now: "2026-01-03T00:00:00Z", includeSecrets: true }),
    );
    const entries = await readZipEntries(buffer);
    const settings = JSON.parse(entries["library/settings.json"] ?? "{}") as ZipSettings;

    expect(settings).toEqual({ locale: "tr", tmdb_api_key: "super-secret" });
  });

  it("two exports of the same data with the same `now` are byte-identical", async () => {
    const { db } = setupSeries();
    const bufferA = await streamToBuffer(exportLibraryZip(db, { now: "2026-01-03T00:00:00Z" }));
    const entriesA = await readZipEntries(bufferA);
    const bufferB = await streamToBuffer(exportLibraryZip(db, { now: "2026-01-03T00:00:00Z" }));
    const entriesB = await readZipEntries(bufferB);

    expect(entriesA).toEqual(entriesB);
  });

  // WP4
  it("omits library/avatar.json when no profile photo is set", async () => {
    const { db } = setupSeries();
    const buffer = await streamToBuffer(exportLibraryZip(db, { now: "2026-01-03T00:00:00Z" }));
    const entries = await readZipEntries(buffer);

    expect(entries["library/avatar.json"]).toBeUndefined();
  });

  it("includes library/avatar.json (base64, no updatedAt) when a photo is set", async () => {
    const { db } = setupSeries();
    db.insert(schema.profileMedia)
      .values({
        kind: "avatar",
        mimeType: "image/webp",
        data: Buffer.from("fake-webp-bytes"),
        updatedAt: "2026-01-02T00:00:00Z",
      })
      .run();
    const buffer = await streamToBuffer(exportLibraryZip(db, { now: "2026-01-03T00:00:00Z" }));
    const entries = await readZipEntries(buffer);

    expect(JSON.parse(entries["library/avatar.json"] ?? "null")).toEqual({
      mimeType: "image/webp",
      data: Buffer.from("fake-webp-bytes").toString("base64"),
    });
  });
});
