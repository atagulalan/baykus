import type {
  EpisodePosition,
  ExternalIds,
  MetadataProvider,
  SearchResult,
  SeriesDetails,
} from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import { matchShows, resolveEpisodePosition } from "./match.ts";
import type { TvTimeShow, TvTimeWatchEvent } from "./parse.ts";

function fixtureSeries(title: string, externalIds: ExternalIds): SeriesDetails {
  return {
    providerId: "fake",
    mediaType: "series",
    externalIds,
    title,
    seasons: [],
  };
}

interface FakeProviderOpts {
  id?: string;
  tvdbLookups?: Record<number, SeriesDetails>;
  searchResults?: Record<string, SearchResult[]>;
  episodePositions?: Record<number, EpisodePosition>;
  withEpisodeLookup?: boolean;
}

function fakeProvider(opts: FakeProviderOpts = {}): MetadataProvider {
  const base: MetadataProvider = {
    id: opts.id ?? "fake",
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
      return opts.searchResults?.[query] ?? [];
    },
    async getSeriesDetails(ref: ExternalIds): Promise<SeriesDetails> {
      const hit = ref.tvdbId !== undefined ? opts.tvdbLookups?.[ref.tvdbId] : undefined;
      if (!hit) throw new Error(`fake provider: no match for ${JSON.stringify(ref)}`);
      return hit;
    },
    resolveImageUrl() {
      return "https://example.test/img";
    },
  };
  if (opts.withEpisodeLookup === false) return base;
  return {
    ...base,
    async findEpisodeByTvdbId(tvdbEpisodeId: number): Promise<EpisodePosition | null> {
      return opts.episodePositions?.[tvdbEpisodeId] ?? null;
    },
  };
}

function show(tvdbId: number, name: string): TvTimeShow {
  return { tvdbId, name, followedAt: "2020-01-01T00:00:00.000Z", unfollowed: false };
}

function watch(tvdbShowId: number, tvdbEpisodeId: number): TvTimeWatchEvent {
  return { tvdbShowId, tvdbEpisodeId, watchedAt: "2020-01-02T00:00:00.000Z", dateUnknown: false };
}

describe("matchShows", () => {
  it("matches a show directly via tvdb lookup", async () => {
    const dark = fixtureSeries("Dark", { tvdbId: 305288, tvmazeId: 1, imdbId: "tt5753856" });
    const provider = fakeProvider({ tvdbLookups: { 305288: dark } });

    const report = await matchShows(
      [show(305288, "Dark")],
      [watch(305288, 1), watch(305288, 2)],
      [provider],
    );

    expect(report.matched).toHaveLength(1);
    expect(report.matched[0]).toMatchObject({
      name: "Dark",
      tvdbId: 305288,
      externalIds: dark.externalIds,
      episodeCount: 2,
      details: dark,
    });
    expect(report.fuzzy).toEqual([]);
    expect(report.unmatched).toEqual([]);
  });

  it("falls back to a high-confidence name search when tvdb lookup fails", async () => {
    const office = fixtureSeries("The Office", { tmdbId: 2316 });
    const provider = fakeProvider({
      searchResults: {
        "The Office": [
          {
            providerId: "fake",
            mediaType: "series",
            externalIds: { tmdbId: 2316 },
            title: "The Office",
          },
        ],
      },
    });
    provider.getSeriesDetails = async (ref) => {
      if (ref.tmdbId === 2316) return office;
      throw new Error("no match");
    };

    const report = await matchShows([show(999, "The Office")], [], [provider]);

    expect(report.matched).toHaveLength(1);
    expect(report.matched[0]?.externalIds).toEqual({ tmdbId: 2316 });
    expect(report.matched[0]?.details).toEqual(office);
  });

  it("buckets a low-confidence name-search result as fuzzy — matches contracts/api.md's own §tvtime example", async () => {
    const provider = fakeProvider({
      searchResults: {
        "The Office": [
          {
            providerId: "fake",
            mediaType: "series",
            externalIds: { tmdbId: 2316 },
            title: "The Office (US)",
            year: 2005,
          },
        ],
      },
    });

    const report = await matchShows([show(999, "The Office")], [watch(999, 1)], [provider]);

    expect(report.matched).toEqual([]);
    expect(report.fuzzy).toHaveLength(1);
    expect(report.fuzzy[0]).toEqual({
      name: "The Office",
      tvdbId: 999,
      episodeCount: 1,
      candidates: [{ externalIds: { tmdbId: 2316 }, title: "The Office (US)", year: 2005 }],
      status: "watching",
      underflowDetails: [],
    });
  });

  it("buckets a show with no search results at all as unmatched", async () => {
    const provider = fakeProvider();
    const report = await matchShows(
      [show(1, "Some Local Show")],
      [watch(1, 1), watch(1, 2), watch(1, 3)],
      [provider],
    );

    expect(report.matched).toEqual([]);
    expect(report.fuzzy).toEqual([]);
    expect(report.unmatched).toEqual([
      { name: "Some Local Show", tvdbId: 1, episodeCount: 3, status: "watching" },
    ]);
  });

  it("reports progress once per show, with the outcome kind and a stable total, regardless of completion order", async () => {
    const dark = fixtureSeries("Dark", { tvdbId: 305288 });
    const provider = fakeProvider({
      tvdbLookups: { 305288: dark },
      searchResults: {
        "The Office": [
          {
            providerId: "fake",
            mediaType: "series",
            externalIds: { tmdbId: 2316 },
            title: "The Office (US)",
            year: 2005,
          },
        ],
      },
    });

    const events: { done: number; total: number; name: string; status: string }[] = [];
    await matchShows(
      [show(305288, "Dark"), show(999, "The Office"), show(1, "Some Local Show")],
      [],
      [provider],
      (event) => {
        events.push(event);
      },
    );

    expect(events).toHaveLength(3);
    expect(events.every((e) => e.total === 3)).toBe(true);
    expect(events.map((e) => e.done).sort()).toEqual([1, 2, 3]);
    expect(Object.fromEntries(events.map((e) => [e.name, e.status]))).toEqual({
      Dark: "matched",
      "The Office": "fuzzy",
      "Some Local Show": "unmatched",
    });
  });

  it("tries the next provider when the first one's tvdb lookup fails", async () => {
    const dark = fixtureSeries("Dark", { tvdbId: 305288 });
    const failing = fakeProvider({ id: "failing" });
    const working = fakeProvider({ id: "working", tvdbLookups: { 305288: dark } });

    const report = await matchShows([show(305288, "Dark")], [], [failing, working]);
    expect(report.matched).toHaveLength(1);
  });
});

describe("resolveEpisodePosition", () => {
  it("resolves via the first provider offering findEpisodeByTvdbId", async () => {
    const provider = fakeProvider({
      episodePositions: { 8370139: { seasonNumber: 1, episodeNumber: 1 } },
    });
    const position = await resolveEpisodePosition([provider], 8370139);
    expect(position).toEqual({ seasonNumber: 1, episodeNumber: 1 });
  });

  it("skips providers without findEpisodeByTvdbId", async () => {
    const withoutMethod = fakeProvider({ withEpisodeLookup: false });
    const withMethod = fakeProvider({
      episodePositions: { 1: { seasonNumber: 2, episodeNumber: 3 } },
    });

    const position = await resolveEpisodePosition([withoutMethod, withMethod], 1);
    expect(position).toEqual({ seasonNumber: 2, episodeNumber: 3 });
  });

  it("returns null when no provider can resolve it", async () => {
    const provider = fakeProvider();
    const position = await resolveEpisodePosition([provider], 999);
    expect(position).toBeNull();
  });
});
