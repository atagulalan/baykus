import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRatingsIndex, parseRatingsTsv } from "./datasets.ts";

const SAMPLE_TSV = [
  "tconst\taverageRating\tnumVotes",
  "tt0111161\t9.3\t2900000",
  "tt0068646\t9.2\t2100000",
  "tt9999999\tbad\trow",
].join("\n");

function gzipResponse(text: string): Response {
  return new Response(gzipSync(Buffer.from(text, "utf-8")));
}

describe("parseRatingsTsv", () => {
  it("parses valid rows and skips the header and malformed rows", () => {
    const index = parseRatingsTsv(SAMPLE_TSV);
    expect(index.size).toBe(2);
    expect(index.get("tt0111161")).toEqual({ rating: 9.3, votes: 2900000 });
    expect(index.get("tt0068646")).toEqual({ rating: 9.2, votes: 2100000 });
    expect(index.get("tt9999999")).toBeUndefined();
  });
});

describe("createRatingsIndex", () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "baykus-imdb-"));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("downloads, caches to disk, and looks up a rating", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(gzipResponse(SAMPLE_TSV));

    const index = createRatingsIndex(dataDir);
    const result = await index.get("tt0111161");

    expect(result).toEqual({ rating: 9.3, votes: 2900000 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(existsSync(join(dataDir, "imdb", "title.ratings.tsv.gz"))).toBe(true);
    expect(existsSync(join(dataDir, "imdb", "title.ratings.meta.json"))).toBe(true);
  });

  it("returns undefined for an unknown id without a second download", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(gzipResponse(SAMPLE_TSV));
    const index = createRatingsIndex(dataDir);

    expect(await index.get("tt0000000")).toBeUndefined();
    expect(await index.get("tt0068646")).toEqual({ rating: 9.2, votes: 2100000 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reuses the cached file within the 24h TTL — no second download", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(gzipResponse(SAMPLE_TSV));
    const first = createRatingsIndex(dataDir);
    await first.get("tt0111161");

    const second = createRatingsIndex(dataDir);
    await second.get("tt0068646");

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("re-downloads once the cached file is older than the 24h TTL", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(gzipResponse(SAMPLE_TSV))
      .mockResolvedValueOnce(gzipResponse(SAMPLE_TSV));

    const first = createRatingsIndex(dataDir);
    await first.get("tt0111161");

    const metaPath = join(dataDir, "imdb", "title.ratings.meta.json");
    const staleTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    writeFileSync(metaPath, JSON.stringify({ downloadedAt: staleTimestamp }));

    const second = createRatingsIndex(dataDir);
    await second.get("tt0111161");

    expect(fetch).toHaveBeenCalledTimes(2);
    const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as { downloadedAt: string };
    expect(new Date(meta.downloadedAt).getTime()).toBeGreaterThan(
      new Date(staleTimestamp).getTime(),
    );
  });

  it("throws when the download fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 503 }));
    const index = createRatingsIndex(dataDir);
    await expect(index.get("tt0111161")).rejects.toThrow(/503/);
  });
});
