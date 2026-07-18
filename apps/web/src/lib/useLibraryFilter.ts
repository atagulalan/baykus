import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listSeries } from "../api/client.ts";
import { HOME_CATEGORY_ORDER, type SeriesSummary, type WatchCategory } from "../api/types.ts";
import type {
  LibraryBrowsePatch,
  LibraryCategoryFilter,
  LibrarySort,
} from "../components/FilterPanel.tsx";
import { groupByCategory } from "./groupByCategory.ts";
import { readUiPrefs, updateUiPrefs } from "./uiPrefs.ts";

/**
 * Sort + category filter for Library / AllSeries grid surfaces (E128 / E143).
 * Persisted in localStorage via uiPrefs.
 */
export function useLibraryFilter(
  defaultCategoryOrder: readonly WatchCategory[] = HOME_CATEGORY_ORDER,
) {
  const stored = readUiPrefs().libraryBrowse;
  const [sort, setSort] = useState<LibrarySort>(stored.sort);
  const [category, setCategory] = useState<LibraryCategoryFilter>(stored.category);

  const query = useQuery({
    queryKey: ["library", sort],
    queryFn: () => listSeries({ sort }),
  });

  const items = query.data?.items ?? [];
  const byCategory = groupByCategory(items);
  const categoriesToRender: WatchCategory[] =
    category.length === 0 ? [...defaultCategoryOrder] : category;

  function apply(next: Pick<LibraryBrowsePatch, "sort" | "category">) {
    setSort(next.sort);
    setCategory(next.category);
    updateUiPrefs({ libraryBrowse: { sort: next.sort, category: next.category } });
  }

  function resetCategory() {
    setCategory([]);
    updateUiPrefs({ libraryBrowse: { sort, category: [] } });
  }

  function hasVisibleIn(
    predicate: (list: SeriesSummary[]) => SeriesSummary[] = (list) => list,
  ): boolean {
    return categoriesToRender.some((c) => predicate(byCategory.get(c) ?? []).length > 0);
  }

  return {
    sort,
    category,
    apply,
    resetCategory,
    query,
    items,
    byCategory,
    categoriesToRender,
    hasVisibleItems: hasVisibleIn(),
    hasVisibleListItems: hasVisibleIn((list) => list.filter((s) => s.nextUnwatched != null)),
  };
}
