import { describe, expect, it } from "vitest";
import type { SeriesPreview } from "../api/types.ts";
import { seriesPreviewAsDetail } from "./seriesPreviewAsDetail.ts";

function preview(partial: Partial<SeriesPreview> = {}): SeriesPreview {
  return {
    externalIds: { tvmazeId: 1 },
    title: "Test Show",
    year: 2020,
    overview: "Overview",
    posterRef: null,
    backdropRef: null,
    tagline: null,
    network: "HBO",
    genres: [{ name: "Drama" }],
    releaseStatus: "ended",
    libraryItemId: null,
    seasons: [
      {
        number: 1,
        name: null,
        overview: null,
        posterRef: null,
        airDate: "2020-01-01",
        episodes: [
          {
            id: 100001,
            s: 1,
            e: 1,
            title: "Pilot",
            overview: null,
            airDate: "2020-01-01",
            airStamp: null,
            runtimeMin: 45,
            stillRef: null,
            episodeType: null,
            communityRating: null,
            myRating: null,
            watchCount: 0,
            lastWatchedAt: null,
          },
        ],
      },
    ],
    networks: [{ name: "HBO" }],
    originalLanguage: "en",
    episodeRunTimes: [45],
    contentRatings: [],
    tags: [],
    cast: [],
    watchProviders: [],
    externalRatings: [],
    ...partial,
  };
}

describe("seriesPreviewAsDetail", () => {
  it("maps preview metadata onto a SeriesDetail shell", () => {
    const detail = seriesPreviewAsDetail(preview());
    expect(detail.title).toBe("Test Show");
    expect(detail.category).toBe("not_started");
    expect(detail.progress.watched).toBe(0);
    expect(detail.progress.aired).toBe(1);
    expect(detail.networks).toEqual([{ name: "HBO" }]);
    expect(detail.favorite).toBe(false);
  });

  it("falls back to network string when networks array is empty", () => {
    const detail = seriesPreviewAsDetail(preview({ networks: [], network: "AMC" }));
    expect(detail.networks).toEqual([{ name: "AMC" }]);
  });
});
