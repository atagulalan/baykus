import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCachedImage } from "./cache.ts";

let dataDir: string;

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), "baykus-img-cache-"));
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  rmSync(dataDir, { recursive: true, force: true });
});

function imageResponse(body: string, contentType = "image/jpeg") {
  return new Response(body, { status: 200, headers: { "content-type": contentType } });
}

describe("getCachedImage", () => {
  it("fetches and writes through to disk on a miss", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(imageResponse("bytes-1"));

    const result = await getCachedImage(
      dataDir,
      "tmdb:medium:/a.jpg",
      "https://example.test/a.jpg",
    );

    expect(result.contentType).toBe("image/jpeg");
    expect(result.body.toString()).toBe("bytes-1");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("a cache hit never calls fetch", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(imageResponse("bytes-2"));
    await getCachedImage(dataDir, "tmdb:medium:/b.jpg", "https://example.test/b.jpg");
    vi.mocked(fetch).mockClear();

    const result = await getCachedImage(
      dataDir,
      "tmdb:medium:/b.jpg",
      "https://example.test/b.jpg",
    );

    expect(result.body.toString()).toBe("bytes-2");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("different cache keys never collide", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(imageResponse("thumb-bytes"))
      .mockResolvedValueOnce(imageResponse("medium-bytes"));

    const thumb = await getCachedImage(dataDir, "tmdb:thumb:/c.jpg", "https://example.test/c.jpg");
    const medium = await getCachedImage(
      dataDir,
      "tmdb:medium:/c.jpg",
      "https://example.test/c.jpg",
    );

    expect(thumb.body.toString()).toBe("thumb-bytes");
    expect(medium.body.toString()).toBe("medium-bytes");
  });

  it("throws when the upstream fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(
      getCachedImage(dataDir, "tmdb:medium:/missing.jpg", "https://example.test/missing.jpg"),
    ).rejects.toThrow();
  });
});
