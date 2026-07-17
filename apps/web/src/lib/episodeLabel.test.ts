import { describe, expect, it } from "vitest";
import { formatEpisodeLabel } from "./episodeLabel.ts";

describe("formatEpisodeLabel", () => {
  describe("SxEy format (default)", () => {
    it.each([
      [1, 6, "S1E6"],
      [12, 1, "S12E1"],
      [1, 10, "S1E10"],
      [0, 3, "S0E3"],
      [1, 100, "S1E100"],
    ])("s=%d e=%d → %s", (s, e, expected) => {
      expect(formatEpisodeLabel(s, e, "SxEy")).toBe(expected);
    });
  });

  describe("S01E06 format (zero-padded)", () => {
    it.each([
      [1, 6, "S01E06"],
      [12, 1, "S12E01"],
      [1, 10, "S01E10"],
      [0, 3, "S00E03"],
      [1, 100, "S01E100"],
    ])("s=%d e=%d → %s", (s, e, expected) => {
      expect(formatEpisodeLabel(s, e, "S01E06")).toBe(expected);
    });
  });

  describe("compact format", () => {
    it.each([
      [1, 6, "1×6"],
      [12, 1, "12×1"],
      [1, 10, "1×10"],
      [0, 3, "0×3"],
      [1, 100, "1×100"],
    ])("s=%d e=%d → %s", (s, e, expected) => {
      expect(formatEpisodeLabel(s, e, "compact")).toBe(expected);
    });
  });
});
