import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listSeries } from "../api/client.ts";
import { HOME_CATEGORY_ORDER } from "../api/types.ts";
import { CategorySection } from "../components/CategorySection.tsx";
import {
  DEFAULT_LIBRARY_CATEGORY,
  DEFAULT_LIBRARY_SORT,
  FilterPanel,
  type LibraryCategoryFilter,
  type LibrarySort,
} from "../components/FilterPanel.tsx";
import { SeriesCard } from "../components/SeriesCard.tsx";
import { SERIES_GRID_CLASSNAME } from "../lib/grid.ts";
import { groupByCategory } from "../lib/groupByCategory.ts";
import { maybeStartSweep, useSweepProgress } from "../lib/staleSweep.ts";

export function LibraryPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<LibrarySort>(DEFAULT_LIBRARY_SORT);
  const [category, setCategory] = useState<LibraryCategoryFilter>(DEFAULT_LIBRARY_CATEGORY);
  const sweepProgress = useSweepProgress();

  // One unfiltered query per sort — category filtering/grouping happens client-side (ui.md 002 §Home).
  const query = useQuery({
    queryKey: ["library", sort],
    queryFn: () => listSeries({ sort }),
  });

  // E64: quiet stale-refresh sweep on every library-home mount — module-scoped, throttled,
  // and skipped entirely while a manual refresh-all (now on the profile page) is running.
  useEffect(() => {
    maybeStartSweep({
      onComplete: () => queryClient.invalidateQueries({ queryKey: ["library"] }),
    });
  }, [queryClient]);

  const items = query.data?.items ?? [];
  const byCategory = groupByCategory(items);

  return (
    <section className="flex flex-col gap-6">
      {sweepProgress && (
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {t("library.sweep.progress", { done: sweepProgress.done, total: sweepProgress.total })}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <FilterPanel
          sort={sort}
          category={category}
          onApply={(next) => {
            setSort(next.sort);
            setCategory(next.category);
          }}
        />
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
      ) : category === "all" ? (
        <div className="flex flex-col gap-8">
          {HOME_CATEGORY_ORDER.map((c) => (
            <CategorySection key={c} category={c} items={byCategory.get(c) ?? []} />
          ))}
        </div>
      ) : (
        <div className={SERIES_GRID_CLASSNAME}>
          {(byCategory.get(category) ?? []).map((series) => (
            <SeriesCard key={series.id} series={series} />
          ))}
        </div>
      )}
    </section>
  );
}
