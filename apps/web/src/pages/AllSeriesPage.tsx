import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { listSeries } from "../api/client.ts";
import { CATEGORY_ORDER } from "../api/types.ts";
import { CategorySection } from "../components/CategorySection.tsx";
import {
  DEFAULT_LIBRARY_CATEGORY,
  DEFAULT_LIBRARY_SORT,
  FilterPanel,
  type LibraryCategoryFilter,
  type LibrarySort,
} from "../components/FilterPanel.tsx";
import { ProfileGuard } from "../components/ProfileGuard.tsx";
import { SERIES_GRID_CLASSNAME } from "../lib/grid.ts";
import { groupByCategory } from "../lib/groupByCategory.ts";

/** E60: the full seven-category library, relocated off the home page — no refresh-all, no sweep. */
export function AllSeriesPage() {
  const { handle } = useParams({ from: "/user/$handle/all-series" });

  return (
    <ProfileGuard handle={handle} to="/user/$handle/all-series">
      {() => <AllSeriesPageContent />}
    </ProfileGuard>
  );
}

function AllSeriesPageContent() {
  const { t } = useTranslation();
  const [sort, setSort] = useState<LibrarySort>(DEFAULT_LIBRARY_SORT);
  const [category, setCategory] = useState<LibraryCategoryFilter>(DEFAULT_LIBRARY_CATEGORY);

  const query = useQuery({
    queryKey: ["library", sort],
    queryFn: () => listSeries({ sort }),
  });

  const items = query.data?.items ?? [];
  const byCategory = groupByCategory(items);
  const categoriesToRender = category.length === 0 ? CATEGORY_ORDER : category;
  const hasVisibleItems = categoriesToRender.some((c) => (byCategory.get(c) ?? []).length > 0);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display italic text-snow text-3xl tracking-tight">
          {t("profile.allSeries")}
          {query.data && (
            <span className="font-sans not-italic text-lg text-muted ml-2">
              ({query.data.total})
            </span>
          )}
        </h1>
        {items.length > 0 && (
          <FilterPanel
            sort={sort}
            category={category}
            onApply={(next) => {
              setSort(next.sort);
              setCategory(next.category);
            }}
          />
        )}
      </div>

      {query.isLoading ? (
        <div className={SERIES_GRID_CLASSNAME}>
          {["a", "b", "c", "d", "e", "f"].map((key) => (
            <div
              key={key}
              className="aspect-[2/3] animate-pulse bg-[#101010] border border-white/5"
            />
          ))}
        </div>
      ) : query.isError ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center border border-white/5 bg-[#101010] p-6 mt-4">
          <p className="font-mono text-xs text-muted uppercase tracking-widest">
            {t("errors.generic")}
          </p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="font-mono text-[10px] tracking-widest uppercase border border-white/10 text-snow px-4 py-2 hover:bg-white/5 transition-colors"
          >
            {t("errors.retry")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center border border-white/5 bg-[#101010] p-6 mt-4">
          <h1 className="font-display italic text-snow text-4xl tracking-tight">
            {t("library.empty.title")}
          </h1>
          <p className="font-mono text-xs text-muted/70">{t("library.empty.hint")}</p>
        </div>
      ) : !hasVisibleItems ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center border border-white/5 bg-[#101010] p-6 mt-4">
          <h1 className="font-display italic text-snow text-4xl tracking-tight">
            {t("library.empty.filterTitle")}
          </h1>
          <p className="font-mono text-xs text-muted/70">{t("library.empty.filterHint")}</p>
          <button
            type="button"
            onClick={() => setCategory([])}
            className="font-mono text-[10px] tracking-widest uppercase bg-yellow text-[#080808] px-4 py-2 mt-4 transition-opacity hover:opacity-90"
          >
            {t("library.empty.resetFilter")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {categoriesToRender.map((c) => (
            <CategorySection key={c} category={c} items={byCategory.get(c) ?? []} />
          ))}
        </div>
      )}
    </section>
  );
}
