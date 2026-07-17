import { describe, expect, it } from "vitest";
import { genreKey } from "./genreKey.ts";

describe("genreKey", () => {
  it("lowercases simple words", () => {
    expect(genreKey("Drama")).toBe("drama");
    expect(genreKey("Comedy")).toBe("comedy");
  });

  it("replaces spaces and special characters with underscores", () => {
    expect(genreKey("Sci-Fi & Fantasy")).toBe("sci_fi___fantasy");
    expect(genreKey("Action/Adventure")).toBe("action_adventure");
  });

  it("handles empty strings safely", () => {
    expect(genreKey("")).toBe("");
  });
});
