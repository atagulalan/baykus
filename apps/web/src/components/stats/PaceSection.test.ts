import { describe, expect, it } from "vitest";
import { projectedCatchUpDate } from "./PaceSection.tsx";

describe("projectedCatchUpDate", () => {
  it("adds N weeks to the reference date", () => {
    const now = new Date("2026-07-17T12:00:00");
    const result = projectedCatchUpDate(19, now);
    expect(result.toISOString().slice(0, 10)).toBe("2026-11-27");
  });

  it("returns the same day when weeks is 0", () => {
    const now = new Date("2026-07-17T12:00:00");
    expect(projectedCatchUpDate(0, now).toISOString().slice(0, 10)).toBe("2026-07-17");
  });
});
