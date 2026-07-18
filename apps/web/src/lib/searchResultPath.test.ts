import { describe, expect, it } from "vitest";
import type { SearchResult } from "../api/types.ts";
import { previewSearchQuery, searchResultPath } from "./searchResultPath.ts";

function hit(partial: Partial<SearchResult> & Pick<SearchResult, "externalIds">): SearchResult {
  return {
    providerId: "tmdb",
    mediaType: "series",
    title: "Test",
    ...partial,
  };
}

describe("previewSearchQuery", () => {
  it("encodes present external ids", () => {
    expect(
      previewSearchQuery({
        tmdbId: 1396,
        tvmazeId: 169,
        imdbId: "tt0903747",
        tvdbId: 81189,
      }),
    ).toBe("tmdbId=1396&tvmazeId=169&imdbId=tt0903747&tvdbId=81189");
  });

  it("omits missing ids", () => {
    expect(previewSearchQuery({ tvmazeId: 169 })).toBe("tvmazeId=169");
  });
});

describe("searchResultPath", () => {
  it("uses internal series path for library hits", () => {
    expect(
      searchResultPath(
        hit({
          libraryItemId: 42,
          externalIds: { tmdbId: 1396 },
        }),
      ),
    ).toBe("/series/i42");
  });

  it("uses preview path with query for new shows", () => {
    expect(
      searchResultPath(
        hit({
          externalIds: { tmdbId: 1396, tvmazeId: 169 },
        }),
      ),
    ).toBe("/series/new?tmdbId=1396&tvmazeId=169");
  });

  it("falls back to bare /series/new when no ids", () => {
    expect(searchResultPath(hit({ externalIds: {} }))).toBe("/series/new");
  });
});
