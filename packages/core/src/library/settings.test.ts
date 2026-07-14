import { describe, expect, it } from "vitest";
import { openLibraryDb } from "../db/open.ts";
import { getSettings, getTmdbApiKey, updateSettings } from "./settings.ts";

describe("getSettings", () => {
  it("returns defaults on a fresh database", () => {
    const { db } = openLibraryDb(":memory:");
    expect(getSettings(db)).toEqual({
      locale: "tr",
      region: "TR",
      theme: "dark",
      scrapersEnabled: false,
      tmdbApiKeySet: false,
    });
  });
});

describe("updateSettings", () => {
  it("upserts individual keys and returns the merged settings", () => {
    const { db } = openLibraryDb(":memory:");

    const first = updateSettings(db, { locale: "en" });
    expect(first).toMatchObject({ locale: "en", region: "TR" });

    const second = updateSettings(db, { region: "US", scrapersEnabled: true });
    expect(second).toEqual({
      locale: "en",
      region: "US",
      theme: "dark",
      scrapersEnabled: true,
      tmdbApiKeySet: false,
    });
  });

  it("setting tmdbApiKey never echoes the raw value back", () => {
    const { db } = openLibraryDb(":memory:");
    const result = updateSettings(db, { tmdbApiKey: "super-secret" });
    expect(result.tmdbApiKeySet).toBe(true);
    expect(result).not.toHaveProperty("tmdbApiKey");
    expect(getTmdbApiKey(db)).toBe("super-secret");
  });

  it("clearing tmdbApiKey with null removes it", () => {
    const { db } = openLibraryDb(":memory:");
    updateSettings(db, { tmdbApiKey: "super-secret" });
    const result = updateSettings(db, { tmdbApiKey: null });
    expect(result.tmdbApiKeySet).toBe(false);
    expect(getTmdbApiKey(db)).toBeUndefined();
  });

  it("a second PATCH overwrites the value for the same key", () => {
    const { db } = openLibraryDb(":memory:");
    updateSettings(db, { region: "US" });
    const result = updateSettings(db, { region: "DE" });
    expect(result.region).toBe("DE");
  });
});
