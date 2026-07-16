import { describe, expect, it } from "vitest";
import { backAffordance } from "./backFallback.ts";

describe("backAffordance (E72)", () => {
  it("series detail falls back to home", () => {
    expect(backAffordance("/series/i42", "xava")).toEqual({ to: "/" });
    expect(backAffordance("/series/94997", "xava")).toEqual({ to: "/" });
  });

  it("import falls back to settings", () => {
    expect(backAffordance("/import", "xava")).toEqual({ to: "/settings" });
  });

  it("settings falls back to the self profile", () => {
    expect(backAffordance("/settings", "xava")).toEqual({
      to: "/user/$handle",
      params: { handle: "xava" },
    });
    expect(backAffordance("/settings", "me")).toEqual({
      to: "/user/$handle",
      params: { handle: "me" },
    });
  });

  it("profile subpages (all-series, stats) fall back to the self profile", () => {
    expect(backAffordance("/user/xava/all-series", "xava")).toEqual({
      to: "/user/$handle",
      params: { handle: "xava" },
    });
    expect(backAffordance("/user/xava/stats", "xava")).toEqual({
      to: "/user/$handle",
      params: { handle: "xava" },
    });
  });

  it("the five tab pages get no arrow at all", () => {
    expect(backAffordance("/", "xava")).toBeNull();
    expect(backAffordance("/watch", "xava")).toBeNull();
    expect(backAffordance("/calendar", "xava")).toBeNull();
    expect(backAffordance("/search", "xava")).toBeNull();
    expect(backAffordance("/user/xava", "xava")).toBeNull();
  });
});
