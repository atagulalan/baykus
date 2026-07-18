import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSerializdProvider } from "./provider.ts";

const fixturePath = fileURLToPath(
  new URL("../../../fixtures/serializd/show-94997-next-data.json", import.meta.url),
);
const fixtureJson = readFileSync(fixturePath, "utf-8");

function htmlResponse(json: string, status = 200): Response {
  const html = `<html><body><script id="__NEXT_DATA__" type="application/json">${json}</script></body></html>`;
  return new Response(html, { status });
}

describe("createSerializdProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("has the expected id and capability flags", () => {
    const provider = createSerializdProvider();
    expect(provider.id).toBe("serializd");
    expect(provider.requiresApiKey).toBe(false);
    expect(provider.capabilities).toEqual({
      search: false,
      details: false,
      upcoming: false,
      watchProviders: false,
      externalRatings: true,
      tags: true,
      images: false,
      credits: false,
    });
  });

  it("fetches by tmdbId with a browser User-Agent and maps external ratings", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(htmlResponse(fixtureJson));
    const provider = createSerializdProvider();

    const ratings = await provider.getExternalRatings?.({ tmdbId: 94997 });
    expect(ratings).toEqual([expect.objectContaining({ source: "serializd", value: 7.88 })]);

    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url).toBe("https://www.serializd.com/show/94997");
    expect((init as RequestInit)?.headers).toMatchObject({
      "User-Agent": expect.stringContaining("Mozilla"),
    });
  });

  it("maps tags from a separate fetch", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(htmlResponse(fixtureJson));
    const provider = createSerializdProvider();
    const tags = await provider.getTags?.({ tmdbId: 94997 });
    expect(tags?.length).toBeGreaterThan(0);
  });

  it("returns [] without fetching when no tmdbId is present", async () => {
    const provider = createSerializdProvider();
    expect(await provider.getExternalRatings?.({ imdbId: "tt123" })).toEqual([]);
    expect(await provider.getTags?.({ imdbId: "tt123" })).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("surfaces a NOT_FOUND ProviderError on a 404", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 404 }));
    const provider = createSerializdProvider();
    await expect(provider.getExternalRatings?.({ tmdbId: 1 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("surfaces PARSE_FAILED when the page shape has drifted", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("<html>no next data</html>"));
    const provider = createSerializdProvider();
    await expect(provider.getExternalRatings?.({ tmdbId: 1 })).rejects.toMatchObject({
      code: "PARSE_FAILED",
    });
  });

  it("search/getSeriesDetails/resolveImageUrl are unsupported (never called by the app)", async () => {
    const provider = createSerializdProvider();
    await expect(provider.search("x")).rejects.toMatchObject({ code: "UNSUPPORTED" });
    await expect(provider.getSeriesDetails({ tmdbId: 1 })).rejects.toMatchObject({
      code: "UNSUPPORTED",
    });
    expect(() => provider.resolveImageUrl("serializd:x", "thumb")).toThrow();
  });
});
