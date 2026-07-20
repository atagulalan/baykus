import { afterEach, describe, expect, it } from "vitest";
import type { WatchCategory } from "../api/types.ts";
import {
  clearUiPrefsForTests,
  DEFAULT_WATCH_SECTIONS,
  hydrateUiPrefsFromServer,
  readBrowsePath,
  readUiPrefs,
  resetUiSelections,
  resetUiWarnings,
  sectionSort,
  sortsForCategory,
  updateUiPrefs,
} from "./uiPrefs.ts";

afterEach(() => {
  clearUiPrefsForTests();
});

describe("uiPrefs (E143)", () => {
  it("defaults to home categories (E186) excluding needs_review", () => {
    const prefs = readUiPrefs();
    expect(prefs.watchSections).toEqual([
      "watching",
      "not_watched_recently",
      "not_started",
      "watch_later",
      "up_to_date",
    ]);
    expect(prefs.watchSections).toEqual(DEFAULT_WATCH_SECTIONS);
    expect(prefs.skipSectionRemoveConfirm).toBe(false);
    expect(prefs.historyCollapsed).toBe(false);
    expect(prefs.showNextUpCarousel).toBe(true);
    expect(prefs.browseView).toBe("list");
    expect(readBrowsePath()).toBe("/watch");
  });

  it("expands prior factory defaults to the home section set (E186)", () => {
    hydrateUiPrefsFromServer({
      libraryBrowse: { sort: "title", category: ["watching"] },
      watchSections: ["watching", "not_watched_recently", "up_to_date"],
      watchSectionSorts: {},
      historyCollapsed: false,
      skipSectionRemoveConfirm: false,
      showNextUpCarousel: true,
      browseView: "list",
    });
    expect(readUiPrefs().watchSections).toEqual(DEFAULT_WATCH_SECTIONS);

    hydrateUiPrefsFromServer({
      libraryBrowse: { sort: "title", category: ["watching"] },
      watchSections: ["watching", "not_watched_recently"],
      watchSectionSorts: {},
      historyCollapsed: false,
      skipSectionRemoveConfirm: false,
      showNextUpCarousel: true,
      browseView: "list",
    });
    expect(readUiPrefs().watchSections).toEqual(DEFAULT_WATCH_SECTIONS);
  });

  it("keeps intentional custom section lists", () => {
    hydrateUiPrefsFromServer({
      libraryBrowse: { sort: "title", category: ["watching"] },
      watchSections: ["watching", "finished"],
      watchSectionSorts: {},
      historyCollapsed: false,
      skipSectionRemoveConfirm: false,
      showNextUpCarousel: true,
      browseView: "list",
    });
    expect(readUiPrefs().watchSections).toEqual(["watching", "finished"]);
  });

  it("persists patches", () => {
    updateUiPrefs({ historyCollapsed: true, skipSectionRemoveConfirm: true });
    expect(readUiPrefs().historyCollapsed).toBe(true);
    expect(readUiPrefs().skipSectionRemoveConfirm).toBe(true);
  });

  it("resetUiSelections restores sections/filters but keeps warnings", () => {
    updateUiPrefs({
      watchSections: ["finished"],
      skipSectionRemoveConfirm: true,
      historyCollapsed: true,
    });
    const next = resetUiSelections();
    expect(next.watchSections).toEqual(DEFAULT_WATCH_SECTIONS);
    expect(next.historyCollapsed).toBe(false);
    expect(next.skipSectionRemoveConfirm).toBe(true);
  });

  it("resetUiWarnings clears don’t-show-again", () => {
    updateUiPrefs({ skipSectionRemoveConfirm: true });
    expect(resetUiWarnings().skipSectionRemoveConfirm).toBe(false);
  });

  it("always restores pinned watching and strips needs_review from stored sections", () => {
    updateUiPrefs({ watchSections: ["finished", "stopped"] });
    expect(readUiPrefs().watchSections).toEqual(["watching", "finished", "stopped"]);
  });

  it("drops needs_review from stored sections (auto-rendered when non-empty)", () => {
    updateUiPrefs({ watchSections: ["watching", "needs_review", "up_to_date"] });
    expect(readUiPrefs().watchSections).toEqual(["watching", "up_to_date"]);
  });

  it("persists showNextUpCarousel (E144)", () => {
    updateUiPrefs({ showNextUpCarousel: false });
    expect(readUiPrefs().showNextUpCarousel).toBe(false);
    expect(resetUiSelections().showNextUpCarousel).toBe(true);
  });

  it("hydrateUiPrefsFromServer overwrites local from server", () => {
    updateUiPrefs({ historyCollapsed: true });
    hydrateUiPrefsFromServer({
      libraryBrowse: { sort: "title", category: ["finished"] },
      watchSections: ["watching", "up_to_date"],
      watchSectionSorts: { up_to_date: "rating" },
      historyCollapsed: false,
      skipSectionRemoveConfirm: true,
      showNextUpCarousel: true,
      browseView: "list",
    });
    const prefs = readUiPrefs();
    expect(prefs.libraryBrowse.sort).toBe("title");
    expect(prefs.watchSections).toEqual(["watching", "up_to_date"]);
    expect(prefs.watchSectionSorts.up_to_date).toBe("rating");
    expect(prefs.skipSectionRemoveConfirm).toBe(true);
    expect(prefs.historyCollapsed).toBe(false);
  });

  it("persists browseView for Watch tab restore (E142)", () => {
    updateUiPrefs({ browseView: "grid" });
    expect(readUiPrefs().browseView).toBe("grid");
    expect(readBrowsePath()).toBe("/");
    expect(resetUiSelections().browseView).toBe("list");
    expect(readBrowsePath()).toBe("/watch");
  });
});

describe("sectionSort per-category defaults (spec 010 WP2)", () => {
  it("gives every category a sensible default when no explicit sort is stored", () => {
    const expected: Record<WatchCategory, ReturnType<typeof sectionSort>> = {
      needs_review: "added",
      watching: "lastWatched",
      not_watched_recently: "lastWatched",
      not_started: "added",
      watch_later: "added",
      up_to_date: "nextAir",
      finished: "lastWatched",
      stopped: "lastWatched",
    };
    for (const [category, sort] of Object.entries(expected) as [WatchCategory, string][]) {
      expect(sectionSort({}, category)).toBe(sort);
    }
  });

  it("an explicit stored sort overrides the category default", () => {
    expect(sectionSort({ not_started: "title" }, "not_started")).toBe("title");
    expect(sectionSort({ watching: "rating" }, "watching")).toBe("rating");
  });

  it("clamps a stored sort that is meaningless for the category", () => {
    expect(sectionSort({ not_started: "lastWatched" }, "not_started")).toBe("added");
    expect(sectionSort({ finished: "nextAir" }, "finished")).toBe("lastWatched");
  });
});

describe("sortsForCategory", () => {
  it("omits all sorts for needs_review (fixed added order, no SortMenu)", () => {
    expect(sortsForCategory("needs_review")).toEqual([]);
  });

  it("omits lastWatched for not_started (zero watches)", () => {
    expect(sortsForCategory("not_started")).toEqual(["added", "title", "rating", "nextAir"]);
  });

  it("omits nextAir for finished and stopped", () => {
    expect(sortsForCategory("finished")).toEqual(["lastWatched", "added", "title", "rating"]);
    expect(sortsForCategory("stopped")).toEqual(["lastWatched", "added", "title", "rating"]);
  });

  it("keeps the full sort list for active-watch categories", () => {
    expect(sortsForCategory("watching")).toEqual([
      "lastWatched",
      "added",
      "title",
      "rating",
      "nextAir",
    ]);
  });
});
