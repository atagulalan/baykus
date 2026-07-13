import type { SeriesDetails } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import { openLibraryDb } from "../db/open.ts";
import { AlreadyInLibraryError } from "./errors.ts";
import { createLibrary } from "./service.ts";

function addDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Shape a TVmaze provider mapping would produce for House of the Dragon. */
function houseOfTheDragonDetails(): SeriesDetails {
  return {
    providerId: "tvmaze",
    mediaType: "series",
    externalIds: { tvmazeId: 44778, imdbId: "tt11198330", tvdbId: 371572 },
    title: "House of the Dragon",
    overview: "The Targaryen dynasty…",
    posterRef: "tvmaze:/img.jpg",
    releaseStatus: "returning",
    firstAirDate: "2022-08-21",
    networks: [{ name: "HBO" }],
    genres: [{ name: "Drama" }],
    seasons: [
      {
        number: 0,
        episodes: [{ seasonNumber: 0, episodeNumber: 1, title: "Making of" }],
      },
      {
        number: 1,
        episodes: [
          {
            seasonNumber: 1,
            episodeNumber: 1,
            title: "The Heirs of the Dragon",
            airDate: addDays(-300),
          },
          { seasonNumber: 1, episodeNumber: 2, title: "The Rogue Prince", airDate: addDays(-293) },
        ],
      },
      {
        number: 3,
        episodes: [{ seasonNumber: 3, episodeNumber: 1, title: "TBA", airDate: addDays(30) }],
      },
    ],
  };
}

describe("createLibrary.addSeries", () => {
  it("adds a series from a mapped provider fixture, round-tripping seasons/episodes/progress", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);

    const summary = library.addSeries(houseOfTheDragonDetails(), "watching");

    expect(summary.title).toBe("House of the Dragon");
    expect(summary.status).toBe("watching");
    expect(summary.network).toBe("HBO");
    expect(summary.year).toBe(2022);
    // Progress excludes season 0 and the unaired S3E1 (E1/E4).
    expect(summary.progress).toEqual({ watched: 0, aired: 2, total: 3 });
    expect(summary.nextUnwatched).toMatchObject({ s: 1, e: 1, title: "The Heirs of the Dragon" });

    const detail = library.getSeries(summary.id);
    expect(detail?.seasons).toHaveLength(3);
    expect(detail?.seasons.find((s) => s.number === 1)?.episodes).toHaveLength(2);
    expect(detail?.seasons.find((s) => s.number === 0)?.episodes).toHaveLength(1);
    expect(detail?.genres).toEqual([{ name: "Drama" }]);
    expect(detail?.externalRatings).toEqual([]);
  });

  it("rejects a duplicate add with AlreadyInLibraryError carrying the existing itemId", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    const first = library.addSeries(houseOfTheDragonDetails(), "watching");

    let caught: unknown;
    try {
      library.addSeries(houseOfTheDragonDetails(), "plan_to_watch");
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(AlreadyInLibraryError);
    expect((caught as AlreadyInLibraryError).itemId).toBe(first.id);
    expect(library.listSeries().total).toBe(1);
  });
});

describe("createLibrary listSeries/getSeries/removeSeries", () => {
  it("filters by status", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    library.addSeries(houseOfTheDragonDetails(), "watching");

    expect(library.listSeries({ status: "watching" }).total).toBe(1);
    expect(library.listSeries({ status: "completed" }).total).toBe(0);
  });

  it("getSeries returns null for an unknown id", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    expect(library.getSeries(999)).toBeNull();
  });

  it("removeSeries hard-deletes and cascades, returning false on a second call", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    const added = library.addSeries(houseOfTheDragonDetails(), "watching");

    expect(library.removeSeries(added.id)).toBe(true);
    expect(library.getSeries(added.id)).toBeNull();
    expect(library.removeSeries(added.id)).toBe(false);
  });

  it("updateTracking changes status and returns the updated summary", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    const added = library.addSeries(houseOfTheDragonDetails(), "watching");

    const updated = library.updateTracking(added.id, { status: "completed" });
    expect(updated?.status).toBe("completed");
    expect(library.getSeries(added.id)?.status).toBe("completed");
  });

  it("updateTracking returns null for an unknown id", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    expect(library.updateTracking(999, { status: "completed" })).toBeNull();
  });
});
