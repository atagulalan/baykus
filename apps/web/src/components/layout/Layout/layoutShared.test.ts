import { describe, expect, it } from "vitest";
import { isBannerChromePage, isProfileHeroPath, isSeriesHeroPath } from "./layoutShared.ts";

describe("isBannerChromePage", () => {
  it("is always on for series hero paths", () => {
    expect(isBannerChromePage("/series/breaking-bad", null)).toBe(true);
    expect(isBannerChromePage("/series/new", undefined)).toBe(true);
  });

  it("is on for profile hub only when a banner is set", () => {
    expect(isBannerChromePage("/user/xava", null)).toBe(false);
    expect(isBannerChromePage("/user/xava", undefined)).toBe(false);
    expect(isBannerChromePage("/user/xava", "tmdb:1/backdrop.jpg")).toBe(true);
  });

  it("ignores nested profile routes", () => {
    expect(isProfileHeroPath("/user/xava/stats")).toBe(false);
    expect(isBannerChromePage("/user/xava/stats", "tmdb:1/backdrop.jpg")).toBe(false);
  });

  it("is off for browse and other surfaces", () => {
    expect(isSeriesHeroPath("/watch")).toBe(false);
    expect(isBannerChromePage("/watch", "tmdb:1/backdrop.jpg")).toBe(false);
  });
});
