import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createLibrary, openLibraryDb } from "@baykus/core";
import type {
  EpisodePosition,
  ExternalIds,
  MetadataProvider,
  SearchResult,
  SeriesDetails,
} from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import yazl from "yazl";
import { createApp } from "../app.ts";
import { createSingleSessionStore } from "../auth/single-session.ts";
import { loadConfig } from "../config.ts";
import { readSseEvents } from "./sse-test-util.ts";

const fixturesDir = fileURLToPath(new URL("../../../../fixtures/tvtime", import.meta.url));
const HEADERS = { "content-type": "application/json", "X-Baykus": "1" };

function readFixture(name: string): string {
  return readFileSync(`${fixturesDir}/${name}`, "utf-8");
}

function zipBuffer(entries: Record<string, string>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const zipfile = new yazl.ZipFile();
    for (const [name, content] of Object.entries(entries)) {
      zipfile.addBuffer(Buffer.from(content, "utf-8"), name);
    }
    const chunks: Buffer[] = [];
    zipfile.outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    zipfile.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    zipfile.outputStream.on("error", reject);
    zipfile.end();
  });
}

function hotdDetails(): SeriesDetails {
  return {
    providerId: "fake",
    mediaType: "series",
    externalIds: { tvdbId: 371572, tvmazeId: 44778, imdbId: "tt11198330" },
    title: "House of the Dragon",
    seasons: [
      {
        number: 1,
        episodes: [
          { seasonNumber: 1, episodeNumber: 1, title: "The Heirs of the Dragon" },
          { seasonNumber: 1, episodeNumber: 2, title: "The Rogue Prince" },
          { seasonNumber: 1, episodeNumber: 3, title: "Second of His Name" },
        ],
      },
    ],
  };
}

function darkDetails(): SeriesDetails {
  return {
    providerId: "fake",
    mediaType: "series",
    externalIds: { tvdbId: 305288, tvmazeId: 1234 },
    title: "Dark",
    seasons: [
      {
        number: 1,
        episodes: [
          { seasonNumber: 1, episodeNumber: 1, title: "Secrets" },
          { seasonNumber: 1, episodeNumber: 2, title: "Lies" },
        ],
      },
    ],
  };
}

function oshiDetails(): SeriesDetails {
  return {
    providerId: "fake",
    mediaType: "series",
    externalIds: { tvdbId: 421069, tmdbId: 203737 },
    title: "Oshi no Ko",
    seasons: [
      {
        number: 1,
        episodes: [
          { seasonNumber: 1, episodeNumber: 1, title: "Mother and Children" },
          { seasonNumber: 1, episodeNumber: 33, title: "Greed and Passion" },
        ],
      },
    ],
  };
}

function fakeProvider(): MetadataProvider {
  const tvdbLookups: Record<number, SeriesDetails> = {
    371572: hotdDetails(),
    305288: darkDetails(),
    421069: oshiDetails(),
  };
  const episodePositions: Record<number, EpisodePosition> = {
    8370139: { seasonNumber: 1, episodeNumber: 1 },
    8370140: { seasonNumber: 1, episodeNumber: 2 },
    7250041: { seasonNumber: 1, episodeNumber: 1 },
    7250042: { seasonNumber: 1, episodeNumber: 2 },
    9207267: { seasonNumber: 1, episodeNumber: 1 },
    11515142: { seasonNumber: 1, episodeNumber: 33 },
  };

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
    async search(query: string): Promise<SearchResult[]> {
      if (query === "The Office") {
        return [
          {
            providerId: "fake",
            mediaType: "series",
            externalIds: { tmdbId: 2316 },
            title: "The Office (US)",
            year: 2005,
          },
        ];
      }
      return [];
    },
    async getSeriesDetails(ref: ExternalIds): Promise<SeriesDetails> {
      const byTvdb = ref.tvdbId !== undefined ? tvdbLookups[ref.tvdbId] : undefined;
      if (byTvdb) return byTvdb;
      if (ref.tmdbId === 2316) {
        return {
          providerId: "fake",
          mediaType: "series",
          externalIds: { tmdbId: 2316 },
          title: "The Office (US)",
          seasons: [{ number: 1, episodes: [{ seasonNumber: 1, episodeNumber: 1 }] }],
        };
      }
      throw new Error(`no match for ${JSON.stringify(ref)}`);
    },
    async findEpisodeByTvdbId(tvdbEpisodeId: number): Promise<EpisodePosition | null> {
      return episodePositions[tvdbEpisodeId] ?? null;
    },
    resolveImageUrl() {
      return "https://example.test/img";
    },
  };
}

function setup() {
  const library = createLibrary(openLibraryDb(":memory:").db);
  const app = createApp(loadConfig({}), {
    library,
    providers: [fakeProvider()],
    dataDir: "/tmp/baykus-test",
    vapid: { publicKey: "test-public", privateKey: "test-private" },
    auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
  });
  return { app, library };
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

async function postImport(app: ReturnType<typeof createApp>, buffer: Buffer, filename: string) {
  const formData = new FormData();
  formData.append(
    "file",
    new File([toArrayBuffer(buffer)], filename, { type: "application/octet-stream" }),
  );
  return app.request("/api/import/tvtime", {
    method: "POST",
    headers: { "X-Baykus": "1" },
    body: formData,
  });
}

describe("POST /api/import/tvtime", () => {
  it("matches both real fixture shows via tvdb lookup and reports episode counts", async () => {
    const { app } = setup();
    const zip = await zipBuffer({
      "followed_tv_show.csv": readFixture("followed_tv_show.csv"),
      "seen_episode.csv": readFixture("seen_episode.csv"),
    });

    const res = await postImport(app, zip, "export.zip");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      reportId: string;
      matched: { name: string; tvdbId: number; episodes: number }[];
      fuzzy: unknown[];
      unmatched: unknown[];
    };

    expect(body.fuzzy).toEqual([]);
    expect(body.unmatched).toEqual([]);
    expect(body.matched).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "House of the Dragon", tvdbId: 371572, episodes: 2 }),
        expect.objectContaining({ name: "Dark", tvdbId: 305288, episodes: 2 }),
      ]),
    );
  });

  it("buckets a name-search hit below the confidence threshold as fuzzy", async () => {
    const { app } = setup();
    const csv = "tv_show_id,tv_show_name,created_at\n999,The Office,2020-01-01 00:00:00\n";
    const res = await postImport(app, Buffer.from(csv, "utf-8"), "followed_tv_show.csv");

    const body = (await res.json()) as { fuzzy: { name: string; candidates: unknown[] }[] };
    expect(body.fuzzy).toHaveLength(1);
    expect(body.fuzzy[0]?.name).toBe("The Office");
    expect(body.fuzzy[0]?.candidates).toEqual([
      { externalIds: { tmdbId: 2316 }, title: "The Office (US)", year: 2005 },
    ]);
  });

  it("400s when the file field is missing", async () => {
    const { app } = setup();
    const res = await app.request("/api/import/tvtime", {
      method: "POST",
      headers: { "X-Baykus": "1" },
      body: new FormData(),
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/import/tvtime/confirm", () => {
  /** Buckets a parsed SSE response's events by kind. */
  async function parseSSE(res: Response): Promise<{ progress: unknown[]; complete: unknown }> {
    const events = await readSseEvents(res);
    return {
      progress: events.filter((e) => e.event === "progress").map((e) => e.data),
      complete: events.find((e) => e.event === "complete")?.data ?? null,
    };
  }

  it("creates items and watches for matched shows, mapping tvdb episode ids to real episodes", async () => {
    const { app, library } = setup();
    const zip = await zipBuffer({
      "followed_tv_show.csv": readFixture("followed_tv_show.csv"),
      "seen_episode.csv": readFixture("seen_episode.csv"),
    });
    const importRes = await postImport(app, zip, "export.zip");
    const { reportId } = (await importRes.json()) as { reportId: string };

    const confirmRes = await app.request("/api/import/tvtime/confirm", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ reportId, resolutions: [] }),
    });
    expect(confirmRes.status).toBe(200);
    const { progress, complete } = await parseSSE(confirmRes);
    expect(complete).toEqual({ itemsCreated: 2, watchesCreated: 4, skipped: 0 });
    expect(progress).toHaveLength(2);

    const { items } = library.listSeries();
    expect(items.map((i) => i.title).sort()).toEqual(["Dark", "House of the Dragon"]);
    const hotd = items.find((i) => i.title === "House of the Dragon");
    expect(hotd?.progress.watched).toBe(2);
  });

  it("imports a name-keyed watch row (current real TV Time export shape) using its own season/episode numbers, with no episode-position network lookup needed", async () => {
    const { app, library } = setup();
    const zip = await zipBuffer({
      "followed_tv_show.csv": readFixture("followed_tv_show.csv"),
      "seen_episode.csv": readFixture("seen_episode.csv"),
      // real TV Time exports now ship this file instead of/alongside seen_episode.csv;
      // its episode_id (8370141) is deliberately absent from fakeProvider's
      // episodePositions map, proving the position comes from the CSV, not a lookup.
      "seen_episode_source.csv": readFixture("seen_episode_source.csv"),
    });

    const importRes = await postImport(app, zip, "export.zip");
    const { reportId } = (await importRes.json()) as { reportId: string };

    const confirmRes = await app.request("/api/import/tvtime/confirm", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ reportId, resolutions: [] }),
    });
    expect(confirmRes.status).toBe(200);
    const { complete } = await parseSSE(confirmRes);
    expect(complete).toEqual({ itemsCreated: 2, watchesCreated: 5, skipped: 0 });

    const hotd = library.listSeries().items.find((i) => i.title === "House of the Dragon");
    expect(hotd?.progress.watched).toBe(3);
  });

  it("is idempotent: re-running the same import creates no items or duplicate watches", async () => {
    const { app, library } = setup();
    const zip = await zipBuffer({
      "followed_tv_show.csv": readFixture("followed_tv_show.csv"),
      "seen_episode.csv": readFixture("seen_episode.csv"),
    });

    const first = await postImport(app, zip, "export.zip");
    const { reportId: firstId } = (await first.json()) as { reportId: string };
    await app.request("/api/import/tvtime/confirm", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ reportId: firstId, resolutions: [] }),
    });

    const second = await postImport(app, zip, "export.zip");
    const { reportId: secondId } = (await second.json()) as { reportId: string };
    const confirmRes = await app.request("/api/import/tvtime/confirm", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ reportId: secondId, resolutions: [] }),
    });
    const { complete } = await parseSSE(confirmRes);
    expect(complete).toEqual({ itemsCreated: 0, watchesCreated: 0, skipped: 4 });
    expect(library.listSeries().total).toBe(2);
  });

  it("imports a manually-resolved fuzzy show via resolutions", async () => {
    const { app, library } = setup();
    const csv = "tv_show_id,tv_show_name,created_at\n999,The Office,2020-01-01 00:00:00\n";
    const importRes = await postImport(app, Buffer.from(csv, "utf-8"), "followed_tv_show.csv");
    const { reportId } = (await importRes.json()) as { reportId: string };

    const confirmRes = await app.request("/api/import/tvtime/confirm", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        reportId,
        resolutions: [{ name: "The Office", externalIds: { tmdbId: 2316 } }],
      }),
    });
    const { complete } = await parseSSE(confirmRes);
    expect((complete as { itemsCreated: number }).itemsCreated).toBe(1);
    expect(library.listSeries().items[0]?.title).toBe("The Office (US)");
  });

  it("resolves season/episode coordinate discrepancies between TV Time (TVDB) and DB (TMDB) via findEpisodeByTvdbId fallback", async () => {
    const { app, library } = setup();
    const zip = await zipBuffer({
      "followed_tv_show.csv":
        "tv_show_id,tv_show_name,active,diffusion,folder_id,archived,notification_type,user_id,created_at,updated_at\n" +
        "421069,Oshi no Ko,1,original,,0,2,1,2023-05-06 07:38:12,2023-05-06 07:38:12\n",
      "tracking-prod-records-v2.csv":
        "created_at,s_id,ep_id,key,s_no,ep_no,series_name\n" +
        "2023-05-06 07:38:15,421069,9207267,watch-episode-1,1,1,Oshi no Ko\n" +
        "2023-06-30 15:52:49,421069,11515142,watch-episode-2,3,9,Oshi no Ko\n",
    });

    const importRes = await postImport(app, zip, "export.zip");
    const { reportId } = (await importRes.json()) as { reportId: string };

    const confirmRes = await app.request("/api/import/tvtime/confirm", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ reportId, resolutions: [] }),
    });
    expect(confirmRes.status).toBe(200);
    const { complete } = await parseSSE(confirmRes);
    expect(complete).toEqual({ itemsCreated: 1, watchesCreated: 2, skipped: 0 });

    const series = library.listSeries().items.find((i) => i.title === "Oshi no Ko");
    expect(series?.progress.watched).toBe(2);
  });

  it("404s for an unknown reportId", async () => {
    const { app } = setup();
    const res = await app.request("/api/import/tvtime/confirm", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ reportId: "does-not-exist", resolutions: [] }),
    });
    expect(res.status).toBe(404);
  });
});
