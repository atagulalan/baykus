import { describe, expect, it } from "vitest";
import { DEFAULT_LIBRARY_CATEGORY, DEFAULT_LIBRARY_SORT, hasActiveFilter } from "./FilterPanel.tsx";

describe("hasActiveFilter (E70 FAB dot)", () => {
  it("is false at the defaults", () => {
    expect(hasActiveFilter(DEFAULT_LIBRARY_SORT, DEFAULT_LIBRARY_CATEGORY)).toBe(false);
  });

  it("is true when sort differs from the default", () => {
    expect(hasActiveFilter("title", DEFAULT_LIBRARY_CATEGORY)).toBe(true);
  });

  it("is true when category differs from 'all'", () => {
    expect(hasActiveFilter(DEFAULT_LIBRARY_SORT, "watching")).toBe(true);
  });

  it("is true when both differ", () => {
    expect(hasActiveFilter("rating", "finished")).toBe(true);
  });
});
