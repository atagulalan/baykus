import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTmdbProvider } from "./provider.ts";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("createTmdbProvider — tvdbId resolution", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves a show by tvdbId via /find, then fetches ratings", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ tv_results: [{ id: 94997 }], tv_episode_results: [] }))
      .mockResolvedValueOnce(jsonResponse({ vote_average: 7.8, vote_count: 1200 }));

    const provider = createTmdbProvider({ apiKey: "x".repeat(32) });
    const ratings = await provider.getExternalRatings?.({ tvdbId: 371572 });

    expect(ratings).toEqual([
      expect.objectContaining({ source: "tmdb", value: 7.8, scale: 10, votes: 1200 }),
    ]);
    const firstCallUrl = vi.mocked(fetch).mock.calls[0]?.[0] as string;
    expect(firstCallUrl).toContain("/find/371572");
    expect(firstCallUrl).toContain("external_source=tvdb_id");
  });

  it("throws NOT_FOUND when tvdbId has no tv match", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ tv_results: [], tv_episode_results: [] }),
    );
    const provider = createTmdbProvider({ apiKey: "x".repeat(32) });
    await expect(provider.getExternalRatings?.({ tvdbId: 999999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("findEpisodeByTvdbId resolves a bare tvdb episode id to (season, episode)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        tv_results: [],
        tv_episode_results: [{ season_number: 1, episode_number: 1 }],
      }),
    );
    const provider = createTmdbProvider({ apiKey: "x".repeat(32) });
    const position = await provider.findEpisodeByTvdbId?.(8073846);
    expect(position).toEqual({ seasonNumber: 1, episodeNumber: 1 });
  });

  it("findEpisodeByTvdbId returns null when no episode matches", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ tv_results: [], tv_episode_results: [] }),
    );
    const provider = createTmdbProvider({ apiKey: "x".repeat(32) });
    const position = await provider.findEpisodeByTvdbId?.(1);
    expect(position).toBeNull();
  });
});
