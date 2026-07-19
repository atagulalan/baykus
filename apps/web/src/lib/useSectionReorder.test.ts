import { describe, expect, it } from "vitest";
import { visualIndex } from "./useSectionReorder.ts";

describe("visualIndex", () => {
  it("maps indices while dragging down", () => {
    expect(visualIndex(0, 0, 2)).toBe(2);
    expect(visualIndex(1, 0, 2)).toBe(0);
    expect(visualIndex(2, 0, 2)).toBe(1);
    expect(visualIndex(3, 0, 2)).toBe(3);
  });

  it("maps indices while dragging up", () => {
    expect(visualIndex(3, 3, 1)).toBe(1);
    expect(visualIndex(1, 3, 1)).toBe(2);
    expect(visualIndex(2, 3, 1)).toBe(3);
    expect(visualIndex(0, 3, 1)).toBe(0);
  });

  it("is identity when unchanged", () => {
    for (let i = 0; i < 4; i++) {
      expect(visualIndex(i, 1, 1)).toBe(i);
    }
  });
});
