import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  mapCredits,
  mapSearchResults,
  mapSeriesDetails,
  mapWatchProviders,
  resolveTmdbImageUrl,
  type TmdbCreditsResponse,
  type TmdbSearchResponse,
  type TmdbSeasonDetails,
  type TmdbSeriesDetails,
  type TmdbWatchProvidersResponse,
} from "./mapping.ts";

function loadFixture<T>(name: string): T {
  const path = fileURLToPath(new URL(`../../../fixtures/tmdb/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

describe("mapSearchResults", () => {
  it("maps the search fixture to SearchResult[]", () => {
    const fixture = loadFixture<TmdbSearchResponse>("search-tv.json");
    const results = mapSearchResults(fixture);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      providerId: "tmdb",
      mediaType: "series",
      title: "House of the Dragon",
      year: 2022,
      externalIds: { tmdbId: 94997 },
      posterRef: "tmdb:/okrubNzXkGSa6LgrBKRz0eaviHn.jpg",
    });
  });
});

describe("mapSeriesDetails", () => {
  const details = loadFixture<TmdbSeriesDetails>("tv-details.json");
  const season1 = loadFixture<TmdbSeasonDetails>("tv-season-1.json");
  const mapped = mapSeriesDetails(details, [season1]);

  it("maps external_ids and content_ratings", () => {
    expect(mapped.externalIds).toEqual({ tmdbId: 94997, imdbId: "tt11198330", tvdbId: 371572 });
    expect(mapped.contentRatings).toEqual([
      { region: "US", rating: "TV-MA" },
      { region: "TR", rating: "18+" },
    ]);
  });

  it("maps release status, tagline, networks, genres", () => {
    expect(mapped.releaseStatus).toBe("returning");
    expect(mapped.tagline).toBe("Win or die.");
    expect(mapped.networks).toEqual([
      {
        id: 49,
        name: "HBO",
        logoRef: "tmdb:/tuomPhY2UtuPTqqFnKMVHvSb724.png",
        originCountry: "US",
      },
    ]);
    expect(mapped.genres).toEqual([
      { id: 10765, name: "Sci-Fi & Fantasy" },
      { id: 18, name: "Drama" },
      { id: 10759, name: "Action & Adventure" },
    ]);
  });

  it("maps the season's episodes, incl. finale episode_type", () => {
    expect(mapped.seasons).toHaveLength(1);
    const season = mapped.seasons[0];
    expect(season?.number).toBe(1);
    expect(season?.episodes).toHaveLength(3);

    const finale = season?.episodes.find((e) => e.episodeNumber === 10);
    expect(finale?.episodeType).toBe("finale");
    expect(finale?.title).toBe("The Black Queen");

    const standard = season?.episodes.find((e) => e.episodeNumber === 1);
    expect(standard?.episodeType).toBe("standard");
    expect(standard?.runtimeMin).toBe(66);
    expect(standard?.stillRef).toBe("tmdb:/3lBDg3i6nn5R2NKFCJ6oKyUo2j5.jpg");
    expect(standard?.externalRatings).toEqual([
      { source: "tmdb", value: 7.8, scale: 10, votes: 214, fetchedAt: expect.any(String) },
    ]);
  });

  it("drops the empty episode_run_time array rather than keeping []", () => {
    expect(mapped.episodeRunTimes).toBeUndefined();
  });
});

describe("mapWatchProviders", () => {
  const fixture = loadFixture<TmdbWatchProvidersResponse>("tv-watch-providers.json");

  it("flattens the TR region's flatrate entries", () => {
    const providers = mapWatchProviders(fixture, "TR");
    expect(providers).toEqual([
      {
        provider: "HBO Max",
        providerId: 1899,
        type: "flatrate",
        region: "TR",
        logoRef: "tmdb:/embS4GPK7c8pjbuY2O2irV5rYch.jpg",
      },
    ]);
  });

  it("flattens multiple categories for the US region", () => {
    const providers = mapWatchProviders(fixture, "US");
    expect(providers).toHaveLength(2);
    expect(providers.map((p) => p.type).sort()).toEqual(["buy", "flatrate"]);
  });

  it("returns [] for a region with no data", () => {
    expect(mapWatchProviders(fixture, "DE")).toEqual([]);
  });
});

describe("mapCredits", () => {
  const fixture = loadFixture<TmdbCreditsResponse>("tv-credits.json");
  const cast = mapCredits(fixture);

  it("maps name, character, profileRef, order — sorted by billing order", () => {
    expect(cast).toEqual([
      {
        id: 1223786,
        name: "Emma D'Arcy",
        character: "Rhaenyra Targaryen",
        profileRef: "tmdb:/wGSHNjHz5at7WLNXR6Xh6ZTsuGb.jpg",
        order: 0,
      },
      {
        id: 17419,
        name: "Matt Smith",
        character: "Daemon Targaryen",
        profileRef: "tmdb:/xkSXlY5uSDX4h5rGx73KFEqxYUR.jpg",
        order: 1,
      },
      {
        id: 108827,
        name: "Olivia Cooke",
        character: "Alicent Hightower",
        profileRef: "tmdb:/6WdxfBYNhK3xTOex5RVWNS8Nffh.jpg",
        order: 2,
      },
      { id: 233413, name: "Actor No Photo", order: 3 },
    ]);
  });

  it("drops a null profile_path and an empty character rather than keeping them", () => {
    const noPhoto = cast.find((c) => c.name === "Actor No Photo");
    expect(noPhoto?.profileRef).toBeUndefined();
    expect(noPhoto?.character).toBeUndefined();
  });

  it("caps the list at the top-billed 20", () => {
    const many: TmdbCreditsResponse = {
      cast: Array.from({ length: 30 }, (_, i) => ({ id: i, name: `Actor ${i}`, order: i })),
    };
    expect(mapCredits(many)).toHaveLength(20);
  });
});

describe("resolveTmdbImageUrl", () => {
  it("maps each ImageSize to its TMDB size bucket", () => {
    const ref = "tmdb:/okrubNzXkGSa6LgrBKRz0eaviHn.jpg" as const;
    expect(resolveTmdbImageUrl(ref, "thumb")).toBe(
      "https://image.tmdb.org/t/p/w185/okrubNzXkGSa6LgrBKRz0eaviHn.jpg",
    );
    expect(resolveTmdbImageUrl(ref, "medium")).toBe(
      "https://image.tmdb.org/t/p/w342/okrubNzXkGSa6LgrBKRz0eaviHn.jpg",
    );
    expect(resolveTmdbImageUrl(ref, "large")).toBe(
      "https://image.tmdb.org/t/p/w780/okrubNzXkGSa6LgrBKRz0eaviHn.jpg",
    );
    expect(resolveTmdbImageUrl(ref, "original")).toBe(
      "https://image.tmdb.org/t/p/original/okrubNzXkGSa6LgrBKRz0eaviHn.jpg",
    );
  });
});
