import type { MetadataProvider, SeriesDetails } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import { createDetailsProvider, enrichAirStamps } from "./airStamps.ts";

const tmdbDetails: SeriesDetails = {
  providerId: "tmdb",
  mediaType: "series",
  externalIds: { tmdbId: 60625, imdbId: "tt2861424" },
  title: "Rick and Morty",
  seasons: [
    {
      number: 9,
      episodes: [
        { seasonNumber: 9, episodeNumber: 9, title: "Salute Your Morts", airDate: "2026-07-19" },
      ],
    },
  ],
};

describe("enrichAirStamps", () => {
  it("merges TVMaze airstamps onto TMDB episodes by s/e", async () => {
    const tvmaze: MetadataProvider = {
      id: "tvmaze",
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
      search: async () => [],
      getSeriesDetails: async () => ({
        ...tmdbDetails,
        providerId: "tvmaze",
        externalIds: { tvmazeId: 216 },
        seasons: [
          {
            number: 9,
            episodes: [
              {
                seasonNumber: 9,
                episodeNumber: 9,
                airDate: "2026-07-19",
                airStamp: "2026-07-20T03:00:00Z",
              },
            ],
          },
        ],
      }),
      resolveImageUrl: (ref) => ref,
    };

    const enriched = await enrichAirStamps(tmdbDetails, tvmaze);
    expect(enriched.seasons[0]?.episodes[0]?.airStamp).toBe("2026-07-20T03:00:00Z");
  });
});

describe("createDetailsProvider", () => {
  it("wraps the primary provider when TVMaze is also registered", async () => {
    const primary: MetadataProvider = {
      id: "tmdb",
      mediaTypes: ["series"],
      capabilities: {
        search: true,
        details: true,
        upcoming: true,
        watchProviders: true,
        externalRatings: false,
        tags: false,
        images: true,
        credits: false,
      },
      requiresApiKey: true,
      search: async () => [],
      getSeriesDetails: async () => tmdbDetails,
      resolveImageUrl: (ref) => ref,
    };
    const tvmaze: MetadataProvider = {
      ...primary,
      id: "tvmaze",
      requiresApiKey: false,
      getSeriesDetails: async () => ({
        ...tmdbDetails,
        providerId: "tvmaze",
        seasons: [
          {
            number: 9,
            episodes: [
              {
                seasonNumber: 9,
                episodeNumber: 9,
                airDate: "2026-07-19",
                airStamp: "2026-07-20T03:00:00Z",
              },
            ],
          },
        ],
      }),
    };

    const details = await createDetailsProvider([primary, tvmaze])?.getSeriesDetails({
      tmdbId: 60625,
    });
    expect(details?.seasons[0]?.episodes[0]?.airStamp).toBe("2026-07-20T03:00:00Z");
  });
});
