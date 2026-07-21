import { describe, expect, it } from "vitest";
import { buildProgressSegments, isCaughtUpWaiting } from "./progressSegments.ts";

describe("buildProgressSegments (E34)", () => {
  it("returns null when not sequential", () => {
    expect(
      buildProgressSegments({
        sequential: false,
        seasons: [{ number: 1, watched: 1, total: 10, announced: 10 }],
      }),
    ).toBeNull();
  });

  it("builds filled / frontier / hollow", () => {
    expect(
      buildProgressSegments({
        sequential: true,
        seasons: [
          { number: 1, watched: 10, total: 10, announced: 10 },
          { number: 2, watched: 3, total: 10, announced: 10 },
          { number: 3, watched: 0, total: 10, announced: 10 },
        ],
      }),
    ).toEqual([{ kind: "filled" }, { kind: "frontier", percent: 30 }, { kind: "hollow" }]);
  });
});

describe("isCaughtUpWaiting (E180)", () => {
  it("is true when aired done and unaired remain", () => {
    expect(isCaughtUpWaiting({ watched: 8, total: 8, announced: 10 })).toBe(true);
  });

  it("is false when still catching aired", () => {
    expect(isCaughtUpWaiting({ watched: 5, total: 8, announced: 10 })).toBe(false);
  });
});
