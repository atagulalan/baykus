import { describe, expect, it } from "vitest";
import type { SeasonProgress } from "../api/types.ts";
import { buildProgressSegments } from "./SegmentedProgress.tsx";

function sp(seasons: SeasonProgress["seasons"], sequential: boolean): SeasonProgress {
  return { seasons, sequential };
}

describe("buildProgressSegments (E34)", () => {
  it("sequential 4-season mid-S2 case: filled, frontier bar, hollow, hollow", () => {
    const seasons = sp(
      [
        { number: 1, watched: 8, total: 8 },
        { number: 2, watched: 3, total: 10 },
        { number: 3, watched: 0, total: 8 },
        { number: 4, watched: 0, total: 6 },
      ],
      true,
    );

    expect(buildProgressSegments(seasons)).toEqual([
      { kind: "filled" },
      { kind: "frontier", percent: 30 },
      { kind: "hollow" },
      { kind: "hollow" },
    ]);
  });

  it("all seasons fully watched -> all filled squares", () => {
    const seasons = sp(
      [
        { number: 1, watched: 8, total: 8 },
        { number: 2, watched: 10, total: 10 },
      ],
      true,
    );

    expect(buildProgressSegments(seasons)).toEqual([{ kind: "filled" }, { kind: "filled" }]);
  });

  it("caught-up on every aired episode (E50: getSeasonProgress already excludes announced-future episodes from total) -> all filled, no frontier", () => {
    const seasons = sp(
      [
        { number: 1, watched: 8, total: 8 },
        { number: 2, watched: 5, total: 5 },
      ],
      true,
    );

    const segments = buildProgressSegments(seasons);
    expect(segments).toEqual([{ kind: "filled" }, { kind: "filled" }]);
    expect(segments?.some((s) => s.kind === "frontier")).toBe(false);
  });

  it("non-sequential (skip-around) -> null, the fallback bar", () => {
    const seasons = sp(
      [
        { number: 1, watched: 4, total: 8 },
        { number: 2, watched: 10, total: 10 },
      ],
      false,
    );

    expect(buildProgressSegments(seasons)).toBeNull();
  });

  it("13 seasons -> null (fallback, over the 12-season cap)", () => {
    const seasons = sp(
      Array.from({ length: 13 }, (_, i) => ({ number: i + 1, watched: 0, total: 1 })),
      true,
    );

    expect(buildProgressSegments(seasons)).toBeNull();
  });

  it("0 seasons -> null", () => {
    expect(buildProgressSegments(sp([], true))).toBeNull();
  });

  it("1 season, partially watched -> a single frontier bar, no squares", () => {
    const seasons = sp([{ number: 1, watched: 3, total: 8 }], true);

    expect(buildProgressSegments(seasons)).toEqual([{ kind: "frontier", percent: 38 }]);
  });
});
