import { describe, expect, it } from "vitest";
import { computeOverflowBadge, shouldShowQuickMarkCheckbox } from "./watchNext.ts";

describe("computeOverflowBadge (E28)", () => {
  it("returns aired - watched - 1 floored at 0", () => {
    expect(computeOverflowBadge({ aired: 5, watched: 2 })).toBe(2);
    expect(computeOverflowBadge({ aired: 3, watched: 2 })).toBe(0);
    expect(computeOverflowBadge({ aired: 2, watched: 2 })).toBe(0);
  });
});

describe("shouldShowQuickMarkCheckbox (E29)", () => {
  it("hides for future air dates", () => {
    expect(
      shouldShowQuickMarkCheckbox({ airDate: "2099-01-01", airStamp: null }),
    ).toBe(false);
  });

  it("shows for past air dates", () => {
    expect(
      shouldShowQuickMarkCheckbox({ airDate: "2020-01-01", airStamp: null }),
    ).toBe(true);
  });
});
