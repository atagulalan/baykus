import type { EpisodePosition, MetadataProvider, SeriesDetails } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import {
  buildAiredEpisodeOrder,
  buildTvdbAiringOrderMap,
  createWatchResolveContext,
  resolveWatchPosition,
  type WatchResolveInput,
} from "./resolve-watch.ts";

function nierInventory(): SeriesDetails {
  const season1 = Array.from({ length: 12 }, (_, i) => ({
    seasonNumber: 1,
    episodeNumber: i + 1,
    airDate: `2023-01-${String(i + 1).padStart(2, "0")}`,
  }));
  const season2 = Array.from({ length: 12 }, (_, i) => ({
    seasonNumber: 2,
    episodeNumber: i + 1,
    airDate: `2024-07-${String(i + 1).padStart(2, "0")}`,
  }));
  return {
    providerId: "fake",
    mediaType: "series",
    externalIds: { tvdbId: 416998 },
    title: "NieR:Automata Ver1.1a",
    seasons: [
      { number: 1, episodes: season1 },
      { number: 2, episodes: season2 },
    ],
  };
}

function episodeIdByPosition(details: SeriesDetails): Map<string, number> {
  const map = new Map<string, number>();
  let id = 1;
  for (const season of details.seasons) {
    for (const ep of season.episodes) {
      map.set(`${ep.seasonNumber}-${ep.episodeNumber}`, id++);
    }
  }
  return map;
}

function fakeProvider(episodePositions: Record<number, EpisodePosition>): MetadataProvider {
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
      credits: false,
    },
    requiresApiKey: false,
    async search() {
      return [];
    },
    async getSeriesDetails() {
      return nierInventory();
    },
    async findEpisodeByTvdbId(tvdbEpisodeId: number) {
      return episodePositions[tvdbEpisodeId] ?? null;
    },
    resolveImageUrl() {
      return "https://example.test/img";
    },
  };
}

describe("buildAiredEpisodeOrder", () => {
  it("orders non-special episodes by air date then season/episode", () => {
    const order = buildAiredEpisodeOrder(nierInventory());
    expect(order).toHaveLength(24);
    expect(order[0]).toEqual({ seasonNumber: 1, episodeNumber: 1 });
    expect(order[11]).toEqual({ seasonNumber: 1, episodeNumber: 12 });
    expect(order[12]).toEqual({ seasonNumber: 2, episodeNumber: 1 });
    expect(order[23]).toEqual({ seasonNumber: 2, episodeNumber: 12 });
  });
});

describe("buildTvdbAiringOrderMap", () => {
  it("maps ascending TVDB episode ids to airing-order slots", () => {
    const watches: WatchResolveInput[] = [
      { tvdbEpisodeId: 100, seasonNumber: 1, episodeNumber: 13 },
      { tvdbEpisodeId: 50, seasonNumber: 1, episodeNumber: 1 },
      { tvdbEpisodeId: 75, seasonNumber: 1, episodeNumber: 7 },
    ];
    const aired = buildAiredEpisodeOrder(nierInventory());
    const map = buildTvdbAiringOrderMap(watches, aired);
    expect(map.get(50)).toEqual({ seasonNumber: 1, episodeNumber: 1 });
    expect(map.get(75)).toEqual({ seasonNumber: 1, episodeNumber: 2 });
    expect(map.get(100)).toEqual({ seasonNumber: 1, episodeNumber: 3 });
  });
});

describe("resolveWatchPosition", () => {
  it("uses a direct CSV match when the slot exists in inventory", async () => {
    const details = nierInventory();
    const episodeIds = episodeIdByPosition(details);
    const ctx = createWatchResolveContext(details, [], episodeIds, []);
    const position = await resolveWatchPosition(
      { tvdbEpisodeId: 1, seasonNumber: 1, episodeNumber: 5 },
      ctx,
    );
    expect(position).toEqual({ seasonNumber: 1, episodeNumber: 5 });
  });

  it("falls back to findEpisodeByTvdbId when the TVDB airing-order map has no entry", async () => {
    const details = nierInventory();
    const episodeIds = episodeIdByPosition(details);
    const provider = fakeProvider({ 10563987: { seasonNumber: 2, episodeNumber: 8 } });
    const ctx = createWatchResolveContext(details, [], episodeIds, [provider]);
    const position = await resolveWatchPosition(
      { tvdbEpisodeId: 10563987, seasonNumber: 1, episodeNumber: 20 },
      ctx,
    );
    expect(position).toEqual({ seasonNumber: 2, episodeNumber: 8 });
  });

  it("uses the TVDB airing-order map when CSV and provider lookup both fail (TVmaze-only drift)", async () => {
    const details = nierInventory();
    const episodeIds = episodeIdByPosition(details);
    const watches: WatchResolveInput[] = Array.from({ length: 24 }, (_, i) => ({
      tvdbEpisodeId: 9_000_000 + i,
      seasonNumber: 1,
      episodeNumber: i + 1,
    }));
    const ctx = createWatchResolveContext(details, watches, episodeIds, []);
    const position = await resolveWatchPosition(
      { tvdbEpisodeId: 9_000_013, seasonNumber: 1, episodeNumber: 14 },
      ctx,
    );
    expect(position).toEqual({ seasonNumber: 2, episodeNumber: 2 });
  });

  it("prefers the TVDB airing-order map when TV Time's season number diverges from the provider", async () => {
    const details: SeriesDetails = {
      providerId: "fake",
      mediaType: "series",
      externalIds: { tvdbId: 327417 },
      title: "La Casa de Papel",
      seasons: [
        {
          number: 3,
          episodes: [{ seasonNumber: 3, episodeNumber: 1, airDate: "2019-01-01" }],
        },
        {
          number: 5,
          episodes: [{ seasonNumber: 5, episodeNumber: 10, airDate: "2021-12-01" }],
        },
      ],
    };
    const episodeIds = episodeIdByPosition(details);
    const watches: WatchResolveInput[] = [
      { tvdbEpisodeId: 100, seasonNumber: 3, episodeNumber: 1 },
      { tvdbEpisodeId: 200, seasonNumber: 3, episodeNumber: 10 },
    ];
    const ctx = createWatchResolveContext(details, watches, episodeIds, []);
    const position = await resolveWatchPosition(
      { tvdbEpisodeId: 200, seasonNumber: 3, episodeNumber: 10 },
      ctx,
    );
    expect(position).toEqual({ seasonNumber: 5, episodeNumber: 10 });
  });

  it("excludes season bulk marks from the primary map but assigns bulk-only TVDB ids to the airing tail", () => {
    const aired = buildAiredEpisodeOrder(nierInventory());
    const watches: WatchResolveInput[] = [
      { tvdbEpisodeId: 10, seasonNumber: 2, episodeNumber: 0 },
      { tvdbEpisodeId: 20, seasonNumber: 1, episodeNumber: 1 },
      { tvdbEpisodeId: 30, seasonNumber: 1, episodeNumber: 2 },
      { tvdbEpisodeId: 40, seasonNumber: 4, episodeNumber: 0 },
    ];
    const map = buildTvdbAiringOrderMap(watches, aired);
    expect(map.get(20)).toEqual({ seasonNumber: 1, episodeNumber: 1 });
    expect(map.get(30)).toEqual({ seasonNumber: 1, episodeNumber: 2 });
    expect(map.get(10)).toEqual({ seasonNumber: 1, episodeNumber: 3 });
    expect(map.get(40)).toEqual({ seasonNumber: 1, episodeNumber: 4 });
  });
});
