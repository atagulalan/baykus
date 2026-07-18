import { describe, expect, it } from "vitest";
import { CATEGORY_ORDER, HOME_CATEGORY_ORDER, type SeriesSummary } from "../api/types.ts";
import { groupByCategory } from "./groupByCategory.ts";

function fakeSeries(id: number, category: SeriesSummary["category"]): SeriesSummary {
  return {
    id,
    title: `Show ${id}`,
    tmdbId: null,
    posterRef: null,
    backdropRef: null,
    year: null,
    category,
    manualList: null,
    lastWatchedAt: null,
    rating: null,
    releaseStatus: null,
    network: null,
    progress: { watched: 0, aired: 0, total: 0 },
    seasonProgress: { seasons: [], sequential: true },
    nextUnwatched: null,
    nextAirDate: null,
    pushMuted: false,
    favorite: false,
    needsReview: false,
  };
}

describe("HOME_CATEGORY_ORDER (E59)", () => {
  it("excludes finished/stopped while CATEGORY_ORDER (all eight) stays untouched", () => {
    expect(HOME_CATEGORY_ORDER).not.toContain("finished");
    expect(HOME_CATEGORY_ORDER).not.toContain("stopped");
    expect(CATEGORY_ORDER).toContain("finished");
    expect(CATEGORY_ORDER).toContain("stopped");
    expect(CATEGORY_ORDER).toHaveLength(8);
    expect(HOME_CATEGORY_ORDER).toHaveLength(6);
  });
});

describe("groupByCategory", () => {
  it("groups items by category, preserving arbitrary categories not in either order list", () => {
    const items = [fakeSeries(1, "watching"), fakeSeries(2, "finished"), fakeSeries(3, "watching")];
    const grouped = groupByCategory(items);
    expect(grouped.get("watching")?.map((s) => s.id)).toEqual([1, 3]);
    expect(grouped.get("finished")?.map((s) => s.id)).toEqual([2]);
    expect(grouped.get("stopped")).toBeUndefined();
  });
});
