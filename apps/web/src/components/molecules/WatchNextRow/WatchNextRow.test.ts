import { describe, expect, it } from "vitest";
import { computeOverflowBadge, shouldShowQuickMarkCheckbox } from "./WatchNextRow.tsx";

describe("computeOverflowBadge (E28)", () => {
  it("is 0 when the shown next episode is the only aired-unwatched one", () => {
    expect(computeOverflowBadge({ aired: 5, watched: 4 })).toBe(0);
  });

  it("counts additional aired-unwatched episodes behind the shown next one", () => {
    expect(computeOverflowBadge({ aired: 8, watched: 4 })).toBe(3);
  });

  it("never goes negative", () => {
    expect(computeOverflowBadge({ aired: 0, watched: 0 })).toBe(0);
  });
});

describe("shouldShowQuickMarkCheckbox (E29)", () => {
  it("shows the checkbox when the episode has aired", () => {
    expect(shouldShowQuickMarkCheckbox({ airDate: "2026-07-15", airStamp: null })).toBe(true);
  });

  it("hides the checkbox before airStamp instant even when airDate is today", () => {
    expect(
      shouldShowQuickMarkCheckbox({
        airDate: "2026-07-19",
        airStamp: "2026-07-20T03:00:00Z",
      }),
    ).toBe(false);
  });

  it("hides the checkbox when schedule is unknown", () => {
    expect(shouldShowQuickMarkCheckbox({ airDate: null, airStamp: null })).toBe(false);
  });
});
