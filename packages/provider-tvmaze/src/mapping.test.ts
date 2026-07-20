import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  mapSearchResults,
  mapSeriesDetails,
  type TvmazeSearchEntry,
  type TvmazeShow,
} from "./mapping.ts";

function loadFixture<T>(name: string): T {
  const path = fileURLToPath(new URL(`../../../fixtures/tvmaze/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

describe("mapSearchResults", () => {
  it("maps search fixture to SearchResult[] with tvmazeId+imdbId+tvdbId", () => {
    const fixture = loadFixture<TvmazeSearchEntry[]>("search-shows.json");
    const results = mapSearchResults(fixture);

    expect(results).toHaveLength(3);
    const [hotd] = results;
    expect(hotd).toMatchObject({
      providerId: "tvmaze",
      mediaType: "series",
      title: "House of the Dragon",
      year: 2022,
      network: "HBO",
      externalIds: { tvmazeId: 44778, imdbId: "tt11198330", tvdbId: 371572 },
    });
    expect(hotd?.score).toBe(1);
    // second/third results have externals with nulls — those keys must be absent, not null.
    const second = results[1];
    expect(second?.externalIds.imdbId).toBeUndefined();
    expect(second?.externalIds.tvdbId).toBeUndefined();
  });
});

describe("mapSeriesDetails", () => {
  const show = loadFixture<TvmazeShow>("show-details-embed-episodes.json");
  const details = mapSeriesDetails(show);

  it("maps details fixture to SeriesDetails with 26 episodes in 3 seasons", () => {
    expect(details.seasons).toHaveLength(3);
    expect(details.seasons.map((s) => s.number)).toEqual([1, 2, 3]);
    const totalEpisodes = details.seasons.reduce((sum, s) => sum + s.episodes.length, 0);
    expect(totalEpisodes).toBe(26);
    expect(details.externalIds).toEqual({ tvmazeId: 44778, imdbId: "tt11198330", tvdbId: 371572 });
  });

  it("future episodes keep airDate", () => {
    const season3 = details.seasons.find((s) => s.number === 3);
    const future = season3?.episodes.find((e) => e.episodeNumber === 8);
    expect(future?.airDate).toBe("2026-08-09");
  });

  it("maps the wide background image (main first) to backdropRef", () => {
    expect(details.backdropRef).toBe(
      "tvmaze:https://static.tvmaze.com/uploads/images/original_untouched/627/1568451.jpg",
    );
  });

  it("summary HTML stripped", () => {
    expect(details.overview).toBe(
      "Set 200 years before the events of Game of Thrones, House of the Dragon tells the history of House Targaryen as they fight through a civil war.",
    );
    const s1e1 = details.seasons[0]?.episodes[0];
    expect(s1e1?.overview).not.toMatch(/[<>]/);
  });
});

describe("mapSeriesDetails empty confirmed season (E184)", () => {
  const show = loadFixture<TvmazeShow>("show-details-empty-season.json");
  const details = mapSeriesDetails(show);

  it("keeps a confirmed season with zero episodes", () => {
    expect(details.seasons.map((s) => s.number)).toEqual([1, 2, 3]);
    const season3 = details.seasons.find((s) => s.number === 3);
    expect(season3?.episodes).toEqual([]);
    expect(details.seasons.reduce((sum, s) => sum + s.episodes.length, 0)).toBe(3);
  });

  it("maps season metadata when present", () => {
    const season1 = details.seasons.find((s) => s.number === 1);
    expect(season1?.airDate).toBe("2022-02-18");
    expect(season1?.overview).toBe("Season one.");
    expect(season1?.posterRef).toBe(
      "tvmaze:https://static.tvmaze.com/uploads/images/medium_portrait/545/1362561.jpg",
    );
  });
});
