import { describe, expect, it } from "vitest";
import { EMPTY_FRONTIER_MIN_PX, frontierFillWidth } from "./progressSegments.ts";

describe("frontierFillWidth", () => {
  it("returns percent when progress is non-zero", () => {
    expect(frontierFillWidth(40, 2)).toEqual({ unit: "%", value: 40 });
  });

  it("returns percent 0 on the first segment", () => {
    expect(frontierFillWidth(0, 0)).toEqual({ unit: "%", value: 0 });
  });

  it("honours EMPTY_FRONTIER_MIN_PX for later empty frontiers", () => {
    if (EMPTY_FRONTIER_MIN_PX > 0) {
      expect(frontierFillWidth(0, 1)).toEqual({ unit: "px", value: EMPTY_FRONTIER_MIN_PX });
    } else {
      expect(frontierFillWidth(0, 1)).toEqual({ unit: "%", value: 0 });
    }
  });
});
