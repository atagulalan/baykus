import { describe, expect, it } from "vitest";
import {
  COMPLETED_SEASON_COLLAPSE_MIN,
  autoAdvanceIfSeasonJustCompleted,
  collapseCompletedSeasonRuns,
  defaultExpandedSeasonNumber,
  nextIncompleteSeasonAfter,
  sortSeasonsSpecialsLast,
} from "./seasons.ts";

describe("sortSeasonsSpecialsLast (E37)", () => {
  it("sorts numbered seasons ascending", () => {
    const seasons = [{ number: 3 }, { number: 1 }, { number: 2 }];
    expect(sortSeasonsSpecialsLast(seasons).map((s) => s.number)).toEqual([1, 2, 3]);
  });

  it("moves season 0 (Specials) to the end", () => {
    const seasons = [{ number: 0 }, { number: 1 }, { number: 2 }];
    expect(sortSeasonsSpecialsLast(seasons).map((s) => s.number)).toEqual([1, 2, 0]);
  });

  it("keeps Specials last even when it's already last in the input", () => {
    const seasons = [{ number: 1 }, { number: 2 }, { number: 0 }];
    expect(sortSeasonsSpecialsLast(seasons).map((s) => s.number)).toEqual([1, 2, 0]);
  });

  it("does not mutate the input array", () => {
    const seasons = [{ number: 2 }, { number: 1 }];
    const original = [...seasons];
    sortSeasonsSpecialsLast(seasons);
    expect(seasons).toEqual(original);
  });
});

describe("collapseCompletedSeasonRuns (E165)", () => {
  function nums(entries: ReturnType<typeof collapseCompletedSeasonRuns<{ number: number }>>) {
    return entries.map((e) =>
      e.kind === "season" ? e.season.number : `…${e.seasons.map((s) => s.number).join(",")}`,
    );
  }

  it("does not collapse a single season before the active one", () => {
    const seasons = [1, 2].map((number) => ({ number, complete: number < 2 }));
    expect(COMPLETED_SEASON_COLLAPSE_MIN).toBe(2);
    expect(nums(collapseCompletedSeasonRuns(seasons, (s) => s.complete))).toEqual([1, 2]);
  });

  it("collapses two or more fully-watched seasons before the active one", () => {
    const seasons = [1, 2, 3].map((number) => ({ number, complete: number < 3 }));
    expect(nums(collapseCompletedSeasonRuns(seasons, (s) => s.complete))).toEqual(["…1,2", 3]);
  });

  it("hides the whole finished prefix, not only the middle", () => {
    const seasons = [1, 2, 3, 4, 5].map((number) => ({ number, complete: number < 5 }));
    expect(nums(collapseCompletedSeasonRuns(seasons, (s) => s.complete))).toEqual([
      "…1,2,3,4",
      5,
    ]);
  });

  it("when all seasons are complete, keeps the last and collapses earlier ones", () => {
    const seasons = [1, 2, 3, 4, 5, 6, 7, 8].map((number) => ({ number, complete: true }));
    expect(nums(collapseCompletedSeasonRuns(seasons, (s) => s.complete))).toEqual([
      "…1,2,3,4,5,6,7",
      8,
    ]);
  });

  it("does not collapse seasons after the active one", () => {
    const seasons = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((number) => ({
      number,
      complete: number !== 5 && number !== 10,
    }));
    expect(nums(collapseCompletedSeasonRuns(seasons, (s) => s.complete))).toEqual([
      "…1,2,3,4",
      5,
      6,
      7,
      8,
      9,
      10,
    ]);
  });

  it("never collapses Specials into the prefix", () => {
    const seasons = [
      { number: 1, complete: true },
      { number: 2, complete: true },
      { number: 3, complete: true },
      { number: 4, complete: false },
      { number: 0, complete: true },
    ];
    expect(nums(collapseCompletedSeasonRuns(seasons, (s) => s.complete))).toEqual([
      "…1,2,3",
      4,
      0,
    ]);
  });

  it("expands a gap when its key is in expandedGapKeys", () => {
    const seasons = [1, 2, 3, 4, 5].map((number) => ({ number, complete: number < 5 }));
    const collapsed = collapseCompletedSeasonRuns(seasons, (s) => s.complete);
    const gap = collapsed.find((e) => e.kind === "gap");
    expect(gap?.kind).toBe("gap");
    if (gap?.kind !== "gap") throw new Error("expected gap");
    expect(
      nums(collapseCompletedSeasonRuns(seasons, (s) => s.complete, new Set([gap.gapKey]))),
    ).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("defaultExpandedSeasonNumber (E176)", () => {
  it("returns the numbered season holding nextUnwatched", () => {
    expect(defaultExpandedSeasonNumber({ s: 2, e: 1 })).toBe(2);
  });

  it("returns null when nextUnwatched is in Specials", () => {
    expect(defaultExpandedSeasonNumber({ s: 0, e: 1 })).toBeNull();
  });

  it("returns null when there is no next unwatched episode", () => {
    expect(defaultExpandedSeasonNumber(null)).toBeNull();
  });
});

describe("nextIncompleteSeasonAfter (E176)", () => {
  const seasons = [
    {
      number: 1,
      episodes: [{ watchCount: 1, airDate: "2020-01-01", airStamp: null }],
    },
    {
      number: 2,
      episodes: [{ watchCount: 0, airDate: "2020-01-08", airStamp: null }],
    },
    {
      number: 3,
      episodes: [{ watchCount: 0, airDate: "2020-01-15", airStamp: null }],
    },
  ];

  it("returns the next numbered season with unwatched aired episodes", () => {
    expect(nextIncompleteSeasonAfter(seasons, 1)).toBe(2);
  });

  it("returns null when no later incomplete seasons remain", () => {
    const done = seasons.map((season) => ({
      ...season,
      episodes: season.episodes.map((episode) => ({ ...episode, watchCount: 1 })),
    }));
    expect(nextIncompleteSeasonAfter(done, 3)).toBeNull();
  });

  it("skips Specials when searching forward", () => {
    const withSpecials = [
      ...seasons,
      {
        number: 0,
        episodes: [{ watchCount: 0, airDate: "2020-01-20", airStamp: null }],
      },
    ];
    expect(nextIncompleteSeasonAfter(withSpecials, 2)).toBe(3);
  });

  it("skips empty and TBD-only seasons (no aired episodes)", () => {
    const withEmptyAndTbd = [
      {
        number: 1,
        episodes: [{ watchCount: 1, airDate: "2020-01-01", airStamp: null }],
      },
      { number: 2, episodes: [] },
      {
        number: 3,
        episodes: [{ watchCount: 0, airDate: null, airStamp: null }],
      },
      {
        number: 4,
        episodes: [{ watchCount: 0, airDate: "2020-02-01", airStamp: null }],
      },
    ];
    expect(nextIncompleteSeasonAfter(withEmptyAndTbd, 1)).toBe(4);
  });
});

describe("autoAdvanceIfSeasonJustCompleted (E176)", () => {
  const incomplete = [
    {
      number: 1,
      episodes: [{ watchCount: 0, airDate: "2020-01-01", airStamp: null }],
    },
    {
      number: 2,
      episodes: [{ watchCount: 0, airDate: "2020-01-08", airStamp: null }],
    },
  ];
  const s1Done = [
    {
      number: 1,
      episodes: [{ watchCount: 1, airDate: "2020-01-01", airStamp: null }],
    },
    {
      number: 2,
      episodes: [{ watchCount: 0, airDate: "2020-01-08", airStamp: null }],
    },
  ];
  /** Blue ring: all aired watched, but unaired announced episodes remain (E180). */
  const s1CaughtUpBlue = [
    {
      number: 1,
      episodes: [
        { watchCount: 1, airDate: "2020-01-01", airStamp: null },
        { watchCount: 0, airDate: "2099-01-01", airStamp: null },
      ],
    },
    {
      number: 2,
      episodes: [{ watchCount: 0, airDate: "2020-01-08", airStamp: null }],
    },
  ];

  it("advances when the open season flips to green-check finished", () => {
    const prev = new Map([
      [1, false],
      [2, false],
    ]);
    expect(autoAdvanceIfSeasonJustCompleted(s1Done, 1, prev)).toBe(2);
  });

  it("does not advance on blue aired catch-up while unaired remain (E180)", () => {
    const prev = new Map([
      [1, false],
      [2, false],
    ]);
    expect(autoAdvanceIfSeasonJustCompleted(s1CaughtUpBlue, 1, prev)).toBeUndefined();
  });

  it("does not collapse a manually opened already-finished season", () => {
    const prev = new Map([
      [1, true],
      [2, false],
    ]);
    expect(autoAdvanceIfSeasonJustCompleted(s1Done, 1, prev)).toBeUndefined();
  });

  it("does nothing on the first snapshot (no previous tracking)", () => {
    expect(autoAdvanceIfSeasonJustCompleted(s1Done, 1, new Map())).toBeUndefined();
  });

  it("does nothing while the open season is still incomplete", () => {
    const prev = new Map([
      [1, false],
      [2, false],
    ]);
    expect(autoAdvanceIfSeasonJustCompleted(incomplete, 1, prev)).toBeUndefined();
  });
});
