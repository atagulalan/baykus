import type { Settings, UiPrefsDto, WatchCategory } from "@baykus/api-client";
import { HOME_CATEGORY_ORDER } from "@baykus/api-client";

/** Server-null-safe uiPrefs baseline for patch merges (mirrors web factory defaults). */
export function defaultUiPrefs(): UiPrefsDto {
  return {
    libraryBrowse: { sort: "lastWatched", category: [] },
    watchSections: HOME_CATEGORY_ORDER.filter((c) => c !== "needs_review"),
    watchSectionSorts: {},
    historyCollapsed: false,
    skipSectionRemoveConfirm: false,
    showNextUpCarousel: true,
    browseView: "list",
  };
}

/**
 * E141 / E156: `watching` always present; `needs_review` never stored
 * (rendered on demand when non-empty).
 */
export function ensurePinnedWatchSections(cats: WatchCategory[]): WatchCategory[] {
  const withoutNeedsReview = cats.filter((c) => c !== "needs_review");
  return withoutNeedsReview.includes("watching")
    ? withoutNeedsReview
    : (["watching", ...withoutNeedsReview] as WatchCategory[]);
}

export function resolveUiPrefs(settings: Settings | null): UiPrefsDto {
  if (!settings?.uiPrefs) return defaultUiPrefs();
  const watchSections = ensurePinnedWatchSections(
    (settings.uiPrefs.watchSections?.length
      ? [...settings.uiPrefs.watchSections]
      : defaultUiPrefs().watchSections) as WatchCategory[],
  );
  return {
    ...defaultUiPrefs(),
    ...settings.uiPrefs,
    libraryBrowse: {
      ...defaultUiPrefs().libraryBrowse,
      ...settings.uiPrefs.libraryBrowse,
    },
    watchSectionSorts: { ...settings.uiPrefs.watchSectionSorts },
    watchSections,
  };
}
