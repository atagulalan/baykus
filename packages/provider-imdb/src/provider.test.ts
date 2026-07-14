import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createImdbProvider } from "./provider.ts";

const SAMPLE_TSV = ["tconst\taverageRating\tnumVotes", "tt0111161\t9.3\t2900000"].join("\n");

function gzipResponse(text: string): Response {
  return new Response(gzipSync(Buffer.from(text, "utf-8")));
}

describe("createImdbProvider", () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "baykus-imdb-provider-"));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it("has the expected id and capability flags", () => {
    const provider = createImdbProvider({ dataDir });
    expect(provider.id).toBe("imdb");
    expect(provider.requiresApiKey).toBe(false);
    expect(provider.capabilities).toEqual({
      search: false,
      details: false,
      upcoming: false,
      watchProviders: false,
      externalRatings: true,
      tags: false,
      images: false,
    });
  });

  it("returns a mapped external rating for a known imdbId", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(gzipResponse(SAMPLE_TSV));
    const provider = createImdbProvider({ dataDir });

    const ratings = await provider.getExternalRatings?.({ imdbId: "tt0111161" });
    expect(ratings).toEqual([
      expect.objectContaining({ source: "imdb", value: 9.3, scale: 10, votes: 2900000 }),
    ]);
  });

  it("returns [] for an unknown imdbId without throwing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(gzipResponse(SAMPLE_TSV));
    const provider = createImdbProvider({ dataDir });
    expect(await provider.getExternalRatings?.({ imdbId: "tt0000000" })).toEqual([]);
  });

  it("returns [] when no imdbId is present, without touching the dataset", async () => {
    const provider = createImdbProvider({ dataDir });
    expect(await provider.getExternalRatings?.({ tmdbId: 1 })).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("search/getSeriesDetails/resolveImageUrl are unsupported (never called by the app)", async () => {
    const provider = createImdbProvider({ dataDir });
    await expect(provider.search("x")).rejects.toMatchObject({ code: "UNSUPPORTED" });
    await expect(provider.getSeriesDetails({ imdbId: "tt0111161" })).rejects.toMatchObject({
      code: "UNSUPPORTED",
    });
    expect(() => provider.resolveImageUrl("imdb:x", "thumb")).toThrow();
  });
});
