import type { Settings } from "../api/types.ts";

/** Minimal settings fixture for component tests — keep in sync with schema defaults. */
export const testSettings: Settings = {
  locale: "tr",
  region: "TR",
  theme: "dark",
  scrapersEnabled: false,
  tmdbApiKeySet: false,
  watchingWindowDays: 14,
  episodeLabelFormat: "SxEy",
  spoilerProtection: false,
  defaultStartPage: "home",
  newSeriesDefaultStatus: "watching",
  uiPrefs: {
    libraryBrowse: { sort: "lastWatched", category: [] },
    watchSections: ["watching"],
    watchSectionSorts: {},
    historyCollapsed: false,
    skipSectionRemoveConfirm: false,
    showNextUpCarousel: true,
    browseView: "grid",
  },
  avatarRef: null,
  bannerRef: null,
};
