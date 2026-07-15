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
  const today = "2026-07-15";

  it("shows the checkbox when airDate is today", () => {
    expect(shouldShowQuickMarkCheckbox(today, today)).toBe(true);
  });

  it("shows the checkbox when airDate is in the past", () => {
    expect(shouldShowQuickMarkCheckbox("2026-07-10", today)).toBe(true);
  });

  it("hides the checkbox when airDate is in the future", () => {
    expect(shouldShowQuickMarkCheckbox("2026-07-16", today)).toBe(false);
  });

  it("hides the checkbox when airDate is null (provider data anomaly)", () => {
    expect(shouldShowQuickMarkCheckbox(null, today)).toBe(false);
  });
});
