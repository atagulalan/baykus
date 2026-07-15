import type { SeriesDetails } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import { openLibraryDb } from "../db/open.ts";
import { AlreadyInLibraryError, ManualListConflictError } from "./errors.ts";
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

/** A second, distinct fixture (own externalIds) — fully aired + ended, for finished/up_to_date scenarios. */
function anotherShowDetails(): SeriesDetails {
  return {
    providerId: "tvmaze",
    mediaType: "series",
    externalIds: { tvmazeId: 99999 },
    title: "Another Show",
    releaseStatus: "ended",
    firstAirDate: "2020-01-01",
    seasons: [
      {
        number: 1,
        episodes: [{ seasonNumber: 1, episodeNumber: 1, title: "Pilot", airDate: addDays(-100) }],
      },
    ],
  };
}

describe("createLibrary.addSeries", () => {
  it("adds a series from a mapped provider fixture, round-tripping seasons/episodes/progress", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);

    const summary = library.addSeries(houseOfTheDragonDetails());

    expect(summary.title).toBe("House of the Dragon");
    // A fresh manual add with zero watches sits in "watching" for the window (E30 rung 3a).
    expect(summary.category).toBe("watching");
    expect(summary.manualList).toBeNull();
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
    expect(detail?.tags).toEqual([]);
  });

  it("persists tags (opts.tags) and round-trips them via getSeries — M8.4", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    const tags = [{ source: "serializd", id: 12, name: "🏛️ Politics" }];

    const summary = library.addSeries(houseOfTheDragonDetails(), { tags });

    expect(library.getSeries(summary.id)?.tags).toEqual(tags);
  });

  it("rejects a duplicate add with AlreadyInLibraryError carrying the existing itemId", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    const first = library.addSeries(houseOfTheDragonDetails());

    let caught: unknown;
    try {
      library.addSeries(houseOfTheDragonDetails(), { manualList: "watch_later" });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(AlreadyInLibraryError);
    expect((caught as AlreadyInLibraryError).itemId).toBe(first.id);
    expect(library.listSeries().total).toBe(1);
  });

  it("defaults to a NULL manual list when none is given", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    const summary = library.addSeries(houseOfTheDragonDetails());
    expect(summary.manualList).toBeNull();
  });

  it("honors an explicit manualList at add time", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    const summary = library.addSeries(houseOfTheDragonDetails(), { manualList: "watch_later" });
    expect(summary.manualList).toBe("watch_later");
    expect(summary.category).toBe("watch_later");
  });
});

describe("createLibrary listSeries/getSeries/removeSeries", () => {
  it("filters by category", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    library.addSeries(houseOfTheDragonDetails());

    // A fresh manual add with zero watches sits in "watching" for the window (E30 rung 3a).
    expect(library.listSeries({ category: "watching" }).total).toBe(1);
    expect(library.listSeries({ category: "finished" }).total).toBe(0);
  });

  it("getSeries returns null for an unknown id", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    expect(library.getSeries(999)).toBeNull();
  });

  it("removeSeries hard-deletes and cascades, returning false on a second call", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    const added = library.addSeries(houseOfTheDragonDetails());

    expect(library.removeSeries(added.id)).toBe(true);
    expect(library.getSeries(added.id)).toBeNull();
    expect(library.removeSeries(added.id)).toBe(false);
  });

  it("updateTracking sets manualList and returns the updated summary", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    const added = library.addSeries(houseOfTheDragonDetails());

    const updated = library.updateTracking(added.id, { manualList: "watch_later" });
    expect(updated?.manualList).toBe("watch_later");
    expect(updated?.category).toBe("watch_later");
    expect(library.getSeries(added.id)?.manualList).toBe("watch_later");
  });

  it("updateTracking returns null for an unknown id", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    expect(library.updateTracking(999, { manualList: "watch_later" })).toBeNull();
  });
});

describe("createLibrary listSeries — lastWatched sort", () => {
  it("sorts most-recently-watched first, nulls last", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    const notWatched = library.addSeries(houseOfTheDragonDetails());
    const watched = library.addSeries(anotherShowDetails());

    const epId = library.getSeries(watched.id)?.seasons[0]?.episodes[0]?.id;
    if (epId == null) throw new Error("fixture missing episode");
    library.addWatch(epId, "2026-01-01T00:00:00Z");

    const { items } = library.listSeries({ sort: "lastWatched" });
    expect(items.map((i) => i.id)).toEqual([watched.id, notWatched.id]);
  });
});

describe("createLibrary.updateTracking — E20 guard", () => {
  function addAndWatchFully(library: ReturnType<typeof createLibrary>) {
    const added = library.addSeries(anotherShowDetails());
    const epId = library.getSeries(added.id)?.seasons[0]?.episodes[0]?.id;
    if (epId == null) throw new Error("fixture missing episode");
    library.addWatch(epId, "2026-01-01T00:00:00Z");
    return added;
  }

  it("throws ManualListConflictError when setting stopped on a dynamically-finished series", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    const added = addAndWatchFully(library);
    expect(library.getSeries(added.id)?.category).toBe("finished");

    let caught: unknown;
    try {
      library.updateTracking(added.id, { manualList: "stopped" });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ManualListConflictError);
    expect((caught as ManualListConflictError).itemId).toBe(added.id);
    // The guard must not have applied a partial update.
    expect(library.getSeries(added.id)?.manualList).toBeNull();
  });

  it("allows watch_later on a finished series (rewatch planning)", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    const added = addAndWatchFully(library);

    const updated = library.updateTracking(added.id, { manualList: "watch_later" });
    expect(updated?.manualList).toBe("watch_later");
  });

  it("allows stopped on an up_to_date (ongoing, fully caught up) series", () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    const added = library.addSeries(houseOfTheDragonDetails());
    const today = addDays(0);
    const episodes = library.getSeries(added.id)?.seasons.flatMap((s) => s.episodes) ?? [];
    for (const ep of episodes) {
      if (ep.airDate && ep.airDate <= today) library.addWatch(ep.id, "2026-01-01T00:00:00Z");
    }
    expect(library.getSeries(added.id)?.category).toBe("up_to_date");

    const updated = library.updateTracking(added.id, { manualList: "stopped" });
    expect(updated?.manualList).toBe("stopped");
    expect(updated?.category).toBe("stopped");
  });
});
