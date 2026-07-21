import { describe, expect, it } from "vitest";
import { parseSeriesParam, seriesParam } from "./series-path.ts";

describe("seriesParam (E52)", () => {
  it("uses the TMDB id when present", () => {
    expect(seriesParam({ id: 965, tmdbId: 94997 })).toBe("94997");
  });

  it("falls back to i<internal id> when tmdbId is null", () => {
    expect(seriesParam({ id: 965, tmdbId: null })).toBe("i965");
  });
});

describe("parseSeriesParam (E52)", () => {
  it("parses a bare number as a TMDB id", () => {
    expect(parseSeriesParam("94997")).toEqual({ kind: "tmdb", id: 94997 });
  });

  it("parses an i-prefixed number as an internal id", () => {
    expect(parseSeriesParam("i965")).toEqual({ kind: "internal", id: 965 });
  });

  it.each(["i", "0x1", "", "abc", "i-1", "-1"])("treats junk %j as invalid", (param) => {
    expect(parseSeriesParam(param)).toEqual({ kind: "invalid" });
  });
});

describe("canonical-replace predicate (E52 no-loop guard)", () => {
  it("does not want a replace when the current param already matches the canonical form", () => {
    const detail = { id: 965, tmdbId: 94997 };
    const currentParam = "94997";
    expect(seriesParam(detail) !== currentParam).toBe(false);
  });

  it("wants a replace when the current param is the internal fallback but a tmdbId is now known", () => {
    const detail = { id: 965, tmdbId: 94997 };
    const currentParam = "i965";
    expect(seriesParam(detail) !== currentParam).toBe(true);
  });

  it("does not want a replace when both sides are the same internal fallback (no tmdbId yet)", () => {
    const detail = { id: 965, tmdbId: null };
    const currentParam = "i965";
    expect(seriesParam(detail) !== currentParam).toBe(false);
  });
});
