import type { WatchCategory } from "../api/types.ts";

export type LibrarySort = "lastWatched" | "added" | "title" | "rating" | "nextAir";
/** Kept for `UiPrefsDto.libraryBrowse.category` wire compatibility (api/types.ts, not owned by
 * WP2) — spec 010 WP2 dropped the category-filter UI, so nothing writes a non-empty value
 * anymore, but old/foreign prefs payloads may still carry one and must round-trip cleanly. */
export type LibraryCategoryFilter = WatchCategory[];

export const DEFAULT_LIBRARY_SORT: LibrarySort = "lastWatched";
export const DEFAULT_LIBRARY_CATEGORY: LibraryCategoryFilter = [];

export const SORTS: LibrarySort[] = ["lastWatched", "added", "title", "rating", "nextAir"];
