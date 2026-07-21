import type { Settings, UiPrefsDto } from "@baykus/api-client";
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

export function resolveUiPrefs(settings: Settings | null): UiPrefsDto {
  if (!settings?.uiPrefs) return defaultUiPrefs();
  return {
    ...defaultUiPrefs(),
    ...settings.uiPrefs,
    libraryBrowse: {
      ...defaultUiPrefs().libraryBrowse,
      ...settings.uiPrefs.libraryBrowse,
    },
    watchSectionSorts: { ...settings.uiPrefs.watchSectionSorts },
    watchSections: settings.uiPrefs.watchSections?.length
      ? [...settings.uiPrefs.watchSections]
      : defaultUiPrefs().watchSections,
  };
}
