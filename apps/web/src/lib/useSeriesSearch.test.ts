import { describe, expect, it } from "vitest";
import type { SearchResult } from "../api/types.ts";
import { resultKey } from "./useSeriesSearch.ts";

function fakeResult(externalIds: SearchResult["externalIds"]): SearchResult {
  return { providerId: "tmdb", mediaType: "series", externalIds, title: "Show" };
}

// Smoke test pinning the module boundary — the hook itself is a thin composition of
// react-query/react-i18next/toast that this project has no component-render harness for
// (no @testing-library/react); SearchBar/SearchPage wiring is exercised via pnpm dev.
describe("resultKey", () => {
  it("is stable and distinct across the four external-id shapes", () => {
    const a = fakeResult({ tmdbId: 1 });
    const b = fakeResult({ tvmazeId: 1 });
    const c = fakeResult({ imdbId: "tt1" });
    const d = fakeResult({ tvdbId: 1 });
    const keys = new Set([resultKey(a), resultKey(b), resultKey(c), resultKey(d)]);
    expect(keys.size).toBe(4);
    expect(resultKey(fakeResult({ tmdbId: 42 }))).toBe(resultKey(fakeResult({ tmdbId: 42 })));
  });
});
