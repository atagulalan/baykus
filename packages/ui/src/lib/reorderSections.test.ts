import { describe, expect, it } from "vitest";
import { reorderSections } from "../lib/reorderSections.ts";

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
