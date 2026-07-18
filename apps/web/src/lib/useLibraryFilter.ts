import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listSeries } from "../api/client.ts";
import { HOME_CATEGORY_ORDER, type WatchCategory } from "../api/types.ts";
import type { LibrarySort } from "../components/FilterPanel.tsx";
import { groupByCategory } from "./groupByCategory.ts";
import { readUiPrefs, updateUiPrefs } from "./uiPrefs.ts";

/**
 * Sort for Library / AllSeries grid surfaces (E128 / E143). Spec 010 WP2 killed the
 * category-filter FAB — every category in `defaultCategoryOrder` always renders, and sort
 * is a single page-level value surfaced via `SortMenu` in each section's header. Persisted
 * in localStorage via uiPrefs.
 */
export function useLibraryFilter(
  defaultCategoryOrder: readonly WatchCategory[] = HOME_CATEGORY_ORDER,
) {
  const stored = readUiPrefs().libraryBrowse;
  const [sort, setSortState] = useState<LibrarySort>(stored.sort);

  const query = useQuery({
    queryKey: ["library", sort],
    queryFn: () => listSeries({ sort }),
  });

  const items = query.data?.items ?? [];
  const byCategory = groupByCategory(items);
  const categoriesToRender: WatchCategory[] = [...defaultCategoryOrder];

  function setSort(next: LibrarySort) {
    setSortState(next);
    // Keep the (now inert) stored category around for DTO round-trip — nothing writes to
    // it anymore, but UiPrefsDto.libraryBrowse.category (api/types.ts) still requires it.
    updateUiPrefs({ libraryBrowse: { sort: next, category: stored.category } });
  }

  const hasVisibleItems = categoriesToRender.some((c) => (byCategory.get(c)?.length ?? 0) > 0);

  return {
    sort,
    setSort,
    query,
    items,
    byCategory,
    categoriesToRender,
    hasVisibleItems,
  };
}
