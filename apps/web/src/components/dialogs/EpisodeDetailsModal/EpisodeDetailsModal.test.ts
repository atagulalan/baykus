import { describe, expect, it } from "vitest";
import { formatAirDate, formatWatchedAt } from "./EpisodeDetailsModal.tsx";

describe("EpisodeDetailsModal formatters", () => {
  describe("formatAirDate", () => {
    it("returns empty string for null air date", () => {
      expect(formatAirDate(null)).toBe("");
    });

    it("formats an ISO date for display", () => {
      expect(formatAirDate("2009-04-06")).toMatch(/2009/);
      expect(formatAirDate("2009-04-06")).toMatch(/4|04|Nis|Apr/i);
    });
  });

  describe("formatWatchedAt", () => {
    it("formats ISO datetime in tr-TR locale", () => {
      const formatted = formatWatchedAt("2026-07-15T20:00:00.000Z");
      expect(formatted).toMatch(/2026/);
      expect(formatted).toMatch(/15/);
    });
  });
});
