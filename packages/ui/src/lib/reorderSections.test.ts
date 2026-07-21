import { describe, expect, it } from "vitest";
import { reorderCombined, reorderSections } from "../lib/reorderSections.ts";

describe("reorderSections", () => {
  it("moves an item between indices", () => {
    expect(reorderSections(["watching", "finished", "stopped"], 0, 2)).toEqual([
      "finished",
      "stopped",
      "watching",
    ]);
  });

  it("no-ops out of bounds", () => {
    expect(reorderSections(["watching", "finished"], 0, 5)).toEqual(["watching", "finished"]);
  });
});

describe("reorderCombined", () => {
  const combined = ["watching", "up_to_date", "not_started", "finished"] as const;

  it("reorders within the active zone", () => {
    expect(reorderCombined(combined, 2, 0, 1)).toEqual(["up_to_date", "watching"]);
  });

  it("inserts an available row dragged above the boundary", () => {
    expect(reorderCombined(combined, 2, 2, 1)).toEqual(["watching", "not_started", "up_to_date"]);
  });

  it("drops an active row dragged into the available zone", () => {
    expect(reorderCombined(combined, 2, 1, 2)).toEqual(["watching"]);
  });

  it("leaves the active list unchanged when reordering within the available zone", () => {
    expect(reorderCombined(combined, 2, 2, 3)).toEqual(["watching", "up_to_date"]);
  });

  it("clamps non-removable rows so they can never leave the active zone", () => {
    expect(reorderCombined(combined, 2, 0, 3)).toEqual(["up_to_date", "watching"]);
  });
});
