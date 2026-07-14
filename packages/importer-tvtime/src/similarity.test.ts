import { describe, expect, it } from "vitest";
import { titleSimilarity } from "./similarity.ts";

describe("titleSimilarity", () => {
  it("returns 1 for an exact match", () => {
    expect(titleSimilarity("Dark", "Dark")).toBe(1);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(titleSimilarity("  DARK  ", "dark")).toBe(1);
  });

  it("scores a close variant below the auto-match threshold — contracts/api.md's own §tvtime example treats this exact pair as fuzzy", () => {
    const score = titleSimilarity("The Office", "The Office (US)");
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThan(0.85);
  });

  it("scores unrelated titles low", () => {
    const score = titleSimilarity("Breaking Bad", "The Great British Bake Off");
    expect(score).toBeLessThan(0.4);
  });

  it("stays within [0, 1]", () => {
    expect(titleSimilarity("", "")).toBe(1);
    expect(titleSimilarity("a", "")).toBeGreaterThanOrEqual(0);
    expect(titleSimilarity("a", "")).toBeLessThanOrEqual(1);
  });
});
