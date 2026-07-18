import { describe, expect, it } from "vitest";
import { shouldPromptEpisodeRating } from "./shouldPromptEpisodeRating.ts";

describe("shouldPromptEpisodeRating", () => {
  it("prompts only when myRating is null/undefined", () => {
    expect(shouldPromptEpisodeRating(null)).toBe(true);
    expect(shouldPromptEpisodeRating(undefined)).toBe(true);
    expect(shouldPromptEpisodeRating(1)).toBe(false);
    expect(shouldPromptEpisodeRating(2)).toBe(false);
    expect(shouldPromptEpisodeRating(3)).toBe(false);
  });
});
