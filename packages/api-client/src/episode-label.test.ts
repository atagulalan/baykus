import { describe, expect, it } from "vitest";
import { formatEpisodeLabel } from "./episode-label.ts";

describe("formatEpisodeLabel (E116)", () => {
  it("formats SxEy without padding", () => {
    expect(formatEpisodeLabel(1, 6, "SxEy")).toBe("S1E6");
  });

  it("formats S01E06 with padding", () => {
    expect(formatEpisodeLabel(1, 6, "S01E06")).toBe("S01E06");
  });

  it("formats compact with ×", () => {
    expect(formatEpisodeLabel(1, 6, "compact")).toBe("1×6");
  });
});
