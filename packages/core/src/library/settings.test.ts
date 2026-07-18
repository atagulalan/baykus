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
      watchingWindowDays: 30,
      episodeLabelFormat: "SxEy",
      spoilerProtection: false,
      defaultStartPage: "home",
      newSeriesDefaultStatus: "watching",
      uiPrefs: null,
    });
  });
});

describe("watchingWindowDays (E31)", () => {
  it("defaults to 30 when absent", () => {
    const { db } = openLibraryDb(":memory:");
    expect(getSettings(db).watchingWindowDays).toBe(30);
  });

  it("round-trips a written value", () => {
    const { db } = openLibraryDb(":memory:");
    const result = updateSettings(db, { watchingWindowDays: 7 });
    expect(result.watchingWindowDays).toBe(7);
    expect(getSettings(db).watchingWindowDays).toBe(7);
  });

  it.each([
    "abc",
    "0",
    "9999",
    "3.5",
    "",
  ])("a garbage stored value (%s) reads back as 30", (raw) => {
    const { db, sqlite } = openLibraryDb(":memory:");
    sqlite.prepare("INSERT INTO settings (key, value) VALUES ('watching_window_days', ?)").run(raw);
    expect(getSettings(db).watchingWindowDays).toBe(30);
  });

  it("patching watchingWindowDays leaves other keys intact", () => {
    const { db } = openLibraryDb(":memory:");
    updateSettings(db, { locale: "en", region: "US" });
    const result = updateSettings(db, { watchingWindowDays: 14 });
    expect(result).toMatchObject({ locale: "en", region: "US", watchingWindowDays: 14 });
  });
});

describe("episodeLabelFormat (E116)", () => {
  it("defaults to 'SxEy' when absent", () => {
    const { db } = openLibraryDb(":memory:");
    expect(getSettings(db).episodeLabelFormat).toBe("SxEy");
  });

  it.each(["SxEy", "S01E06", "compact"] as const)("round-trips a written value (%s)", (format) => {
    const { db } = openLibraryDb(":memory:");
    const result = updateSettings(db, { episodeLabelFormat: format });
    expect(result.episodeLabelFormat).toBe(format);
    expect(getSettings(db).episodeLabelFormat).toBe(format);
  });

  it.each([
    "unknown",
    "sxey",
    "",
    "S1E6",
  ])("a garbage stored value (%s) reads back as 'SxEy'", (raw) => {
    const { db, sqlite } = openLibraryDb(":memory:");
    sqlite.prepare("INSERT INTO settings (key, value) VALUES ('episode_label_format', ?)").run(raw);
    expect(getSettings(db).episodeLabelFormat).toBe("SxEy");
  });

  it("patching episodeLabelFormat leaves other keys intact", () => {
    const { db } = openLibraryDb(":memory:");
    updateSettings(db, { locale: "en", watchingWindowDays: 7 });
    const result = updateSettings(db, { episodeLabelFormat: "compact" });
    expect(result).toMatchObject({
      locale: "en",
      watchingWindowDays: 7,
      episodeLabelFormat: "compact",
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
      watchingWindowDays: 30,
      episodeLabelFormat: "SxEy",
      spoilerProtection: false,
      defaultStartPage: "home",
      newSeriesDefaultStatus: "watching",
      uiPrefs: null,
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

describe("uiPrefs (E143)", () => {
  const sample = {
    libraryBrowse: { sort: "title" as const, category: ["watching"] },
    watchSections: ["watching", "finished"],
    watchSectionSorts: { finished: "added" as const },
    historyCollapsed: true,
    skipSectionRemoveConfirm: true,
    showNextUpCarousel: false,
    browseView: "grid" as const,
  };

  it("defaults to null when absent", () => {
    const { db } = openLibraryDb(":memory:");
    expect(getSettings(db).uiPrefs).toBeNull();
  });

  it("round-trips a written object", () => {
    const { db } = openLibraryDb(":memory:");
    const result = updateSettings(db, { uiPrefs: sample });
    expect(result.uiPrefs).toEqual(sample);
    expect(getSettings(db).uiPrefs).toEqual(sample);
  });

  it("null clears the stored key", () => {
    const { db } = openLibraryDb(":memory:");
    updateSettings(db, { uiPrefs: sample });
    const result = updateSettings(db, { uiPrefs: null });
    expect(result.uiPrefs).toBeNull();
  });

  it.each([
    "not-json",
    "{",
    "[]",
    '"string"',
    "null",
  ])("garbage stored value (%s) reads back as null", (raw) => {
    const { db, sqlite } = openLibraryDb(":memory:");
    sqlite.prepare("INSERT INTO settings (key, value) VALUES ('ui_prefs', ?)").run(raw);
    expect(getSettings(db).uiPrefs).toBeNull();
  });

  it("patching uiPrefs leaves other keys intact", () => {
    const { db } = openLibraryDb(":memory:");
    updateSettings(db, { locale: "en", watchingWindowDays: 7 });
    const result = updateSettings(db, { uiPrefs: sample });
    expect(result).toMatchObject({
      locale: "en",
      watchingWindowDays: 7,
      uiPrefs: sample,
    });
  });
});
