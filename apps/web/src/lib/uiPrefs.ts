import { updateSettings } from "../api/client.ts";
import {
  type BrowseView,
  CATEGORY_ORDER,
  HOME_CATEGORY_ORDER,
  type UiPrefsDto,
  type WatchCategory,
} from "../api/types.ts";
import {
  DEFAULT_LIBRARY_CATEGORY,
  DEFAULT_LIBRARY_SORT,
  type LibraryCategoryFilter,
  type LibrarySort,
} from "./librarySort.ts";

/** E143: durable UI prefs — localStorage cache + server settings (zip via settings.json).
 * Falls back to an in-memory map when `localStorage` is unavailable (Node tests, private mode). */
const PREFS_KEY = "baykus.uiPrefs";

/** Legacy session keys — migrated once into PREFS_KEY. */
const LEGACY = {
  libraryBrowse: "baykus.libraryBrowse",
  watchSections: "baykus.watchSections",
  watchSectionSorts: "baykus.watchSectionSorts",
} as const;

const memoryStore = new Map<string, string>();

function storageGet(key: string): string | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage.getItem(key);
  } catch {
    // ignore
  }
  return memoryStore.get(key) ?? null;
}

function storageSet(key: string, value: string): void {
  memoryStore.set(key, value);
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function storageRemove(key: string): void {
  memoryStore.delete(key);
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function sessionGet(key: string): string | null {
  try {
    if (typeof sessionStorage !== "undefined") return sessionStorage.getItem(key);
  } catch {
    // ignore
  }
  return null;
}

function sessionRemove(key: string): void {
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * E186 / E59: default Watch/Library sections = home categories minus `needs_review`
 * (auto-prepended when non-empty — E156). `watching` stays pinned.
 * Prior factory defaults (active-trio only / watching+recent) always expand to this set.
 */
export const DEFAULT_WATCH_SECTIONS: WatchCategory[] = HOME_CATEGORY_ORDER.filter(
  (c) => c !== "needs_review",
);

/** Known prior factory defaults — always expanded to DEFAULT_WATCH_SECTIONS on parse. */
const LEGACY_DEFAULT_WATCH_SECTIONS: readonly (readonly WatchCategory[])[] = [
  ["watching", "not_watched_recently"],
  ["watching", "not_watched_recently", "up_to_date"],
];

export const DEFAULT_BROWSE_VIEW: BrowseView = "list";

export interface LibraryBrowsePrefs {
  sort: LibrarySort;
  category: LibraryCategoryFilter;
}

export interface UiPrefs {
  libraryBrowse: LibraryBrowsePrefs;
  watchSections: WatchCategory[];
  watchSectionSorts: Partial<Record<WatchCategory, LibrarySort>>;
  historyCollapsed: boolean;
  skipSectionRemoveConfirm: boolean;
  showNextUpCarousel: boolean;
  browseView: BrowseView;
}

function isWatchCategory(value: unknown): value is WatchCategory {
  return typeof value === "string" && (CATEGORY_ORDER as readonly string[]).includes(value);
}

function parseBrowseView(raw: unknown): BrowseView {
  return raw === "grid" ? "grid" : "list";
}

function defaultPrefs(): UiPrefs {
  return {
    libraryBrowse: {
      sort: DEFAULT_LIBRARY_SORT,
      category: [...DEFAULT_LIBRARY_CATEGORY],
    },
    watchSections: [...DEFAULT_WATCH_SECTIONS],
    watchSectionSorts: {},
    historyCollapsed: false,
    skipSectionRemoveConfirm: false,
    showNextUpCarousel: true,
    browseView: DEFAULT_BROWSE_VIEW,
  };
}

/**
 * E141 / E156: `watching` is always present; `needs_review` is stripped from
 * stored section prefs (rendered on demand when non-empty, never via “add”).
 */
export function ensurePinnedWatchSections(cats: WatchCategory[]): WatchCategory[] {
  const withoutNeedsReview = cats.filter((c) => c !== "needs_review");
  return withoutNeedsReview.includes("watching")
    ? withoutNeedsReview
    : (["watching", ...withoutNeedsReview] as WatchCategory[]);
}

/** Set when parseSections expands a prior factory default to DEFAULT_WATCH_SECTIONS. */
let watchSectionsUpgraded = false;

function parseSections(raw: unknown): WatchCategory[] {
  watchSectionsUpgraded = false;
  if (!Array.isArray(raw)) return [...DEFAULT_WATCH_SECTIONS];
  const cats = raw.filter(isWatchCategory);
  if (cats.length === 0) return [...DEFAULT_WATCH_SECTIONS];
  const pinned = ensurePinnedWatchSections(cats);
  const key = pinned.join(",");
  if (LEGACY_DEFAULT_WATCH_SECTIONS.some((legacy) => legacy.join(",") === key)) {
    watchSectionsUpgraded = true;
    return [...DEFAULT_WATCH_SECTIONS];
  }
  return pinned;
}

function parseSorts(raw: unknown): Partial<Record<WatchCategory, LibrarySort>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Record<WatchCategory, LibrarySort>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isWatchCategory(key) && typeof value === "string") {
      out[key] = value as LibrarySort;
    }
  }
  return out;
}

function parseBrowse(raw: unknown): LibraryBrowsePrefs {
  if (!raw || typeof raw !== "object") {
    return { sort: DEFAULT_LIBRARY_SORT, category: [...DEFAULT_LIBRARY_CATEGORY] };
  }
  const obj = raw as Partial<LibraryBrowsePrefs>;
  return {
    sort: typeof obj.sort === "string" ? (obj.sort as LibrarySort) : DEFAULT_LIBRARY_SORT,
    category: Array.isArray(obj.category)
      ? (obj.category.filter(isWatchCategory) as LibraryCategoryFilter)
      : [...DEFAULT_LIBRARY_CATEGORY],
  };
}

function normalizePrefs(partial: Partial<UiPrefs> | UiPrefsDto): UiPrefs {
  return {
    libraryBrowse: parseBrowse(partial.libraryBrowse),
    watchSections: parseSections(partial.watchSections),
    watchSectionSorts: parseSorts(partial.watchSectionSorts),
    historyCollapsed: partial.historyCollapsed === true,
    skipSectionRemoveConfirm: partial.skipSectionRemoveConfirm === true,
    showNextUpCarousel: partial.showNextUpCarousel !== false,
    browseView: parseBrowseView(partial.browseView),
  };
}

function toDto(prefs: UiPrefs): UiPrefsDto {
  return {
    libraryBrowse: {
      sort: prefs.libraryBrowse.sort,
      category: [...prefs.libraryBrowse.category],
    },
    watchSections: [...prefs.watchSections],
    watchSectionSorts: { ...prefs.watchSectionSorts },
    historyCollapsed: prefs.historyCollapsed,
    skipSectionRemoveConfirm: prefs.skipSectionRemoveConfirm,
    showNextUpCarousel: prefs.showNextUpCarousel,
    browseView: prefs.browseView,
  };
}

/** True when local prefs differ from factory defaults (used for local→server migrate). */
function isNonDefault(prefs: UiPrefs): boolean {
  const d = defaultPrefs();
  return (
    prefs.historyCollapsed !== d.historyCollapsed ||
    prefs.skipSectionRemoveConfirm !== d.skipSectionRemoveConfirm ||
    prefs.showNextUpCarousel !== d.showNextUpCarousel ||
    prefs.browseView !== d.browseView ||
    prefs.libraryBrowse.sort !== d.libraryBrowse.sort ||
    prefs.libraryBrowse.category.length !== d.libraryBrowse.category.length ||
    prefs.watchSections.join(",") !== d.watchSections.join(",") ||
    Object.keys(prefs.watchSectionSorts).length > 0
  );
}

function migrateLegacy(): Partial<UiPrefs> {
  const partial: Partial<UiPrefs> = {};
  try {
    const browse = sessionGet(LEGACY.libraryBrowse);
    if (browse) partial.libraryBrowse = parseBrowse(JSON.parse(browse));
    const sections = sessionGet(LEGACY.watchSections);
    if (sections) partial.watchSections = parseSections(JSON.parse(sections));
    const sorts = sessionGet(LEGACY.watchSectionSorts);
    if (sorts) partial.watchSectionSorts = parseSorts(JSON.parse(sorts));
    for (const key of Object.values(LEGACY)) {
      sessionRemove(key);
    }
  } catch {
    // ignore
  }
  return partial;
}

export function readUiPrefs(): UiPrefs {
  const base = defaultPrefs();
  try {
    const raw = storageGet(PREFS_KEY);
    if (!raw) {
      const migrated = migrateLegacy();
      const merged = { ...base, ...migrated };
      if (Object.keys(migrated).length > 0) writeUiPrefs(merged);
      return merged;
    }
    const prefs = normalizePrefs(JSON.parse(raw) as Partial<UiPrefs>);
    // Persist the E186 home-set upgrade so the next load does not revert.
    if (watchSectionsUpgraded) writeUiPrefs(prefs);
    return prefs;
  } catch {
    return base;
  }
}

/** E142: Watch tab / wordmark target for the last list↔grid choice. */
export function readBrowsePath(): "/" | "/watch" {
  return readUiPrefs().browseView === "grid" ? "/" : "/watch";
}

function persistLocal(prefs: UiPrefs): void {
  storageSet(PREFS_KEY, JSON.stringify(prefs));
}

/** Fire-and-forget write-through to settings (zip export source of truth). */
function syncToServer(prefs: UiPrefs): void {
  // Vitest has no API server; keep unit tests local-only.
  if (typeof process !== "undefined" && process.env.VITEST) return;
  void updateSettings({ uiPrefs: toDto(prefs) }).catch(() => {
    // offline / unauth — local cache still holds the value
  });
}

export function writeUiPrefs(prefs: UiPrefs): void {
  persistLocal(prefs);
  syncToServer(prefs);
}

/**
 * Apply server settings as source of truth. If server has none but local has
 * non-default prefs, push local up once (E143 localStorage → settings migrate).
 */
export function hydrateUiPrefsFromServer(serverPrefs: UiPrefsDto | null): void {
  if (serverPrefs) {
    const prefs = normalizePrefs(serverPrefs);
    persistLocal(prefs);
    if (watchSectionsUpgraded) syncToServer(prefs);
    return;
  }
  const local = readUiPrefs();
  if (isNonDefault(local)) {
    syncToServer(local);
  }
}

/** Test helper — clears durable + in-memory prefs. Does not hit the API. */
export function clearUiPrefsForTests(): void {
  memoryStore.clear();
  storageRemove(PREFS_KEY);
}

export function updateUiPrefs(patch: Partial<UiPrefs>): UiPrefs {
  const next = { ...readUiPrefs(), ...patch };
  if (patch.watchSections) {
    next.watchSections = ensurePinnedWatchSections(patch.watchSections.filter(isWatchCategory));
  }
  writeUiPrefs(next);
  return next;
}

/** Reset sections + library filters (+ historyCollapsed, unused since spec 010 WP2's history
 * page split, kept for UiPrefsDto round-trip + browse view). Keeps warning dismissals. */
export function resetUiSelections(): UiPrefs {
  const current = readUiPrefs();
  const next: UiPrefs = {
    ...defaultPrefs(),
    skipSectionRemoveConfirm: current.skipSectionRemoveConfirm,
  };
  writeUiPrefs(next);
  return next;
}

/** Reset "don't show again" style warnings only. */
export function resetUiWarnings(): UiPrefs {
  return updateUiPrefs({ skipSectionRemoveConfirm: false });
}

/**
 * Spec 010 WP2: sensible per-category default sort, used until the user picks one
 * explicitly for that section. Chosen from `SeriesSummary`'s available proxy fields —
 * `added` (id desc) and `lastWatched` (lastWatchedAt desc) are exact for their category
 * semantics here, not approximations: id order is insertion order, and for `finished`
 * specifically the last watch *is* the completion event, so `lastWatchedAt` desc is
 * precisely "recently finished first", not a stand-in for a missing `finishedAt`.
 */
const CATEGORY_DEFAULT_SORT: Record<WatchCategory, LibrarySort> = {
  needs_review: "added",
  watching: "lastWatched",
  not_watched_recently: "lastWatched",
  not_started: "added",
  watch_later: "added",
  up_to_date: "nextAir",
  finished: "lastWatched",
  stopped: "lastWatched",
};

/**
 * Sort keys that are meaningful for a category section. `not_started` has zero
 * watches so `lastWatched` is always a no-op; finished/stopped shows rarely have
 * a next air date so `nextAir` is dropped there.
 */
export function sortsForCategory(category: WatchCategory): LibrarySort[] {
  switch (category) {
    case "needs_review":
      // E141: import-review noise — fixed order (added), no SortMenu.
      return [];
    case "not_started":
      return ["added", "title", "rating", "nextAir"];
    case "finished":
    case "stopped":
      return ["lastWatched", "added", "title", "rating"];
    default:
      return ["lastWatched", "added", "title", "rating", "nextAir"];
  }
}

export function sectionSort(
  sorts: Partial<Record<WatchCategory, LibrarySort>>,
  category: WatchCategory,
): LibrarySort {
  const preferred = sorts[category] ?? CATEGORY_DEFAULT_SORT[category];
  const allowed = sortsForCategory(category);
  if (allowed.length === 0) return CATEGORY_DEFAULT_SORT[category];
  return allowed.includes(preferred) ? preferred : CATEGORY_DEFAULT_SORT[category];
}
