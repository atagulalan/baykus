import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { listSeries, refreshAllSeries } from "../api/client.ts";
import { CATEGORY_ORDER, type SeriesSummary } from "../api/types.ts";
import { CategorySection } from "../components/CategorySection.tsx";
import {
  DEFAULT_LIBRARY_CATEGORY,
  DEFAULT_LIBRARY_SORT,
  FilterPanel,
  type LibraryCategoryFilter,
  type LibrarySort,
} from "../components/FilterPanel.tsx";
import { SeriesCard } from "../components/SeriesCard.tsx";
import { useToast } from "../lib/toast.tsx";

function groupByCategory(items: SeriesSummary[]): Map<string, SeriesSummary[]> {
  const map = new Map<string, SeriesSummary[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return map;
}

export function LibraryPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<LibrarySort>(DEFAULT_LIBRARY_SORT);
  const [category, setCategory] = useState<LibraryCategoryFilter>(DEFAULT_LIBRARY_CATEGORY);
  const [refreshProgress, setRefreshProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  // One unfiltered query per sort — category filtering/grouping happens client-side (ui.md 002 §Home).
  const query = useQuery({
    queryKey: ["library", sort],
    queryFn: () => listSeries({ sort }),
  });

  const refreshAllMutation = useMutation({
    mutationFn: () =>
      refreshAllSeries((event) => setRefreshProgress({ done: event.done, total: event.total })),
    onSuccess: (result) => {
      setRefreshProgress(null);
      queryClient.invalidateQueries({ queryKey: ["library"] });
      toast.show(t("library.refreshAllDone", { newEpisodes: result.newEpisodes }));
    },
    onError: () => {
      setRefreshProgress(null);
      toast.show(t("errors.generic"), "error");
    },
  });

  const items = query.data?.items ?? [];
  const byCategory = groupByCategory(items);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {refreshProgress && (
          <span className="text-xs text-zinc-500">
            {refreshProgress.done}/{refreshProgress.total}
          </span>
        )}
        <FilterPanel
          sort={sort}
          category={category}
          onApply={(next) => {
            setSort(next.sort);
            setCategory(next.category);
          }}
        />
        <button
          type="button"
          onClick={() => refreshAllMutation.mutate()}
          disabled={refreshAllMutation.isPending}
          className="font-mono text-[10px] tracking-widest uppercase border border-white/10 text-muted px-4 py-2 hover:text-snow hover:border-white/20 transition-colors disabled:opacity-50"
        >
          {t("library.refreshAll")}
        </button>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
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
          {CATEGORY_ORDER.map((c) => (
            <CategorySection key={c} category={c} items={byCategory.get(c) ?? []} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {(byCategory.get(category) ?? []).map((series) => (
            <SeriesCard key={series.id} series={series} />
          ))}
        </div>
      )}
    </section>
  );
}
