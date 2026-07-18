import { describe, expect, it } from "vitest";
import { backAffordance } from "./backFallback.ts";

describe("backAffordance (E72 / E138 / E142)", () => {
  it("library grid has no back arrow (peer of watch)", () => {
    expect(backAffordance("/", "xava")).toBeNull();
  });

  it("series detail falls back to watch", () => {
    expect(backAffordance("/series/i42", "xava")).toEqual({ to: "/watch" });
    expect(backAffordance("/series/94997", "xava")).toEqual({ to: "/watch" });
  });

  it("watch history falls back to watch (spec 010 WP2)", () => {
    expect(backAffordance("/watch/history", "xava")).toEqual({ to: "/watch" });
  });

  it("import falls back to settings", () => {
    expect(backAffordance("/import", "xava")).toEqual({ to: "/settings" });
  });

  it("settings falls back to the self profile", () => {
    expect(backAffordance("/settings", "xava")).toEqual({
      to: "/user/$handle",
      params: { handle: "xava" },
    });
  });

  it("profile subpages fall back to the self profile", () => {
    expect(backAffordance("/user/xava/all-series", "xava")).toEqual({
      to: "/user/$handle",
      params: { handle: "xava" },
    });
  });

  it("tab / browse pages get no arrow", () => {
    expect(backAffordance("/watch", "xava")).toBeNull();
    expect(backAffordance("/calendar", "xava")).toBeNull();
    expect(backAffordance("/calendar/month", "xava")).toBeNull();
    expect(backAffordance("/search", "xava")).toBeNull();
    expect(backAffordance("/user/xava", "xava")).toBeNull();
  });
});
