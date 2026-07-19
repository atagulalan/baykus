import { describe, expect, it } from "vitest";
import { shouldRetainPosterMorph } from "./posterTransition.ts";

describe("shouldRetainPosterMorph", () => {
  it("keeps browse ↔ series morphs", () => {
    expect(shouldRetainPosterMorph("/", "/series/i1")).toBe(true);
    expect(shouldRetainPosterMorph("/watch", "/series/i1")).toBe(true);
    expect(shouldRetainPosterMorph("/series/i1", "/")).toBe(true);
    expect(shouldRetainPosterMorph("/series/i1", "/watch")).toBe(true);
  });

  it("keeps search/calendar/history → series", () => {
    expect(shouldRetainPosterMorph("/search", "/series/i1")).toBe(true);
    expect(shouldRetainPosterMorph("/calendar", "/series/i1")).toBe(true);
    expect(shouldRetainPosterMorph("/watch/history", "/series/i1")).toBe(true);
  });

  it("drops non-morph hops (armed poster must not linger)", () => {
    expect(shouldRetainPosterMorph("/", "/calendar")).toBe(false);
    expect(shouldRetainPosterMorph("/series/i1", "/calendar")).toBe(false);
    expect(shouldRetainPosterMorph("/watch", "/search")).toBe(false);
    expect(shouldRetainPosterMorph("/series/i1", "/user/me")).toBe(false);
  });
});
