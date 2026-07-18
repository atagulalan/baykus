import { describe, expect, it } from "vitest";
import { nextSearchActiveIndex, resolveSearchEnterIndex } from "./searchListKeyboard.ts";

describe("nextSearchActiveIndex", () => {
  it("returns -1 for an empty list", () => {
    expect(nextSearchActiveIndex(-1, "ArrowDown", 0)).toBe(-1);
    expect(nextSearchActiveIndex(2, "ArrowUp", 0)).toBe(-1);
  });

  it("ArrowDown moves from none to first, then advances, then clamps", () => {
    expect(nextSearchActiveIndex(-1, "ArrowDown", 3)).toBe(0);
    expect(nextSearchActiveIndex(0, "ArrowDown", 3)).toBe(1);
    expect(nextSearchActiveIndex(2, "ArrowDown", 3)).toBe(2);
  });

  it("ArrowUp moves toward none and clamps at none", () => {
    expect(nextSearchActiveIndex(2, "ArrowUp", 3)).toBe(1);
    expect(nextSearchActiveIndex(0, "ArrowUp", 3)).toBe(-1);
    expect(nextSearchActiveIndex(-1, "ArrowUp", 3)).toBe(-1);
  });
});

describe("resolveSearchEnterIndex", () => {
  it("returns -1 for an empty list", () => {
    expect(resolveSearchEnterIndex(-1, 0)).toBe(-1);
    expect(resolveSearchEnterIndex(0, 0)).toBe(-1);
  });

  it("uses the highlight when set", () => {
    expect(resolveSearchEnterIndex(2, 5)).toBe(2);
  });

  it("falls back to first when nothing is highlighted", () => {
    expect(resolveSearchEnterIndex(-1, 5)).toBe(0);
  });

  it("falls back to first when the highlight is out of range", () => {
    expect(resolveSearchEnterIndex(9, 3)).toBe(0);
  });
});
