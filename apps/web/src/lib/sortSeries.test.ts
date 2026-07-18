import { describe, expect, it } from "vitest";
import type { SeriesSummary } from "../api/types.ts";
import { sortSeriesSummaries } from "./sortSeries.ts";

function stub(
  partial: Partial<SeriesSummary> & Pick<SeriesSummary, "id" | "title">,
): SeriesSummary {
  return {
    tmdbId: null,
    posterRef: null,
    year: null,
    category: "watching",
    manualList: null,
    lastWatchedAt: null,
    rating: null,
    releaseStatus: null,
    network: null,
    progress: { aired: 1, watched: 0, total: 1 },
    seasonProgress: { seasons: [{ number: 1, watched: 0, total: 1 }], sequential: true },
    nextUnwatched: {
      episodeId: 1,
      s: 1,
      e: 1,
      title: null,
      airDate: "2026-01-01",
      episodeType: null,
    },
    nextAirDate: null,
    pushMuted: false,
    favorite: false,
    needsReview: false,
    ...partial,
  };
}

describe("sortSeriesSummaries (E141)", () => {
  it("sorts by title", () => {
    const items = [stub({ id: 1, title: "Beta" }), stub({ id: 2, title: "Alpha" })];
    expect(sortSeriesSummaries(items, "title").map((s) => s.title)).toEqual(["Alpha", "Beta"]);
  });

  it("sorts by lastWatched newest first", () => {
    const items = [
      stub({ id: 1, title: "A", lastWatchedAt: "2026-01-01T00:00:00Z" }),
      stub({ id: 2, title: "B", lastWatchedAt: "2026-06-01T00:00:00Z" }),
    ];
    expect(sortSeriesSummaries(items, "lastWatched").map((s) => s.id)).toEqual([2, 1]);
  });

  it("sorts by nextAir earliest first, nulls last", () => {
    const items = [
      stub({ id: 1, title: "A", nextAirDate: "2026-08-01" }),
      stub({ id: 2, title: "B", nextAirDate: null }),
      stub({ id: 3, title: "C", nextAirDate: "2026-07-01" }),
    ];
    expect(sortSeriesSummaries(items, "nextAir").map((s) => s.id)).toEqual([3, 1, 2]);
  });
});
