import { describe, expect, it } from "vitest";
import { mobileBackAffordance } from "./backAffordance.ts";

describe("mobileBackAffordance", () => {
  it("maps series and history to watch", () => {
    expect(mobileBackAffordance("/series/42")).toBe("/(tabs)/watch");
    expect(mobileBackAffordance("/series/new")).toBe("/(tabs)/watch");
    expect(mobileBackAffordance("/watch/history")).toBe("/(tabs)/watch");
  });

  it("maps import to settings", () => {
    expect(mobileBackAffordance("/import")).toBe("/(tabs)/settings");
  });

  it("maps settings to profile", () => {
    expect(mobileBackAffordance("/settings")).toBe("/(tabs)/profile");
  });

  it("maps library and stats to profile", () => {
    expect(mobileBackAffordance("/library/all")).toBe("/(tabs)/profile");
    expect(mobileBackAffordance("/library/favorites")).toBe("/(tabs)/profile");
    expect(mobileBackAffordance("/profile/stats")).toBe("/(tabs)/profile");
  });

  it("returns null for tab roots", () => {
    expect(mobileBackAffordance("/watch")).toBeNull();
    expect(mobileBackAffordance("/")).toBeNull();
    expect(mobileBackAffordance("/profile")).toBeNull();
    expect(mobileBackAffordance("/calendar")).toBeNull();
    expect(mobileBackAffordance("/search")).toBeNull();
  });
});
