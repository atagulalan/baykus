import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listSeries } from "../api/client.ts";
import { HOME_CATEGORY_ORDER, type WatchCategory } from "../api/types.ts";
import { groupByCategory } from "./groupByCategory.ts";
import type { LibrarySort } from "./librarySort.ts";
import { readUiPrefs, sectionSort, updateUiPrefs } from "./uiPrefs.ts";

/**
 * Sort for Library / AllSeries grid surfaces (E128 / E143). Spec 010 WP2 killed the
 * category-filter FAB — every category in `defaultCategoryOrder` always renders.
 * Sort is per-section (same `watchSectionSorts` prefs as Watch), applied client-side.
 * Browse surfaces sort via AddSectionBar (manage); All Series uses sortOnly mode in the page header.
 */
export function useLibraryFilter(
  defaultCategoryOrder: readonly WatchCategory[] = HOME_CATEGORY_ORDER,
) {
  const [sectionSorts, setSectionSorts] = useState(() => readUiPrefs().watchSectionSorts);

  const query = useQuery({
    queryKey: ["library", "browse"],
    queryFn: () => listSeries(),
  });

  const items = query.data?.items ?? [];
  const byCategory = groupByCategory(items);
  const categoriesToRender: WatchCategory[] = [...defaultCategoryOrder];

  function setSort(category: WatchCategory, next: LibrarySort) {
    const updated = { ...sectionSorts, [category]: next };
    setSectionSorts(updated);
    updateUiPrefs({ watchSectionSorts: updated });
  }

  const hasVisibleItems = categoriesToRender.some((c) => (byCategory.get(c)?.length ?? 0) > 0);

  return {
    sectionSorts,
    sortFor: (category: WatchCategory) => sectionSort(sectionSorts, category),
    setSort,
    query,
    items,
    byCategory,
    categoriesToRender,
    hasVisibleItems,
  };
}
