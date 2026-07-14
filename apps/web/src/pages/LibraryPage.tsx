import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { listSeries, refreshAllSeries, refreshSeries, removeSeries } from "../api/client.ts";
import type { TrackingStatus } from "../api/types.ts";
import { SeriesCard } from "../components/SeriesCard.tsx";
import { useToast } from "../lib/toast.tsx";

const STATUS_FILTERS = [
  "all",
  "watching",
  "plan_to_watch",
  "completed",
  "dropped",
  "paused",
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const SORTS = ["added", "title", "rating", "nextAir"] as const;
type Sort = (typeof SORTS)[number];

export function LibraryPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<Sort>("added");
  const [refreshProgress, setRefreshProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  const query = useQuery({
    queryKey: ["library", filter, sort],
    queryFn: () =>
      listSeries({ ...(filter === "all" ? {} : { status: filter as TrackingStatus }), sort }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => removeSeries(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
    onError: () => {
      toast.show(t("library.removeError"), "error");
    },
  });

  function handleRemove(id: number, title: string) {
    if (window.confirm(t("library.removeConfirm", { title }))) {
      removeMutation.mutate(id);
    }
  }

  const refreshOneMutation = useMutation({
    mutationFn: (id: number) => refreshSeries(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["library"] });
      toast.show(
        result.newEpisodes > 0
          ? t("series.refreshFoundNew", { count: result.newEpisodes })
          : t("series.refreshUpToDate"),
      );
    },
    onError: () => toast.show(t("errors.generic"), "error"),
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

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-1 text-sm ${
                filter === value ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {t(value === "all" ? "library.filter.all" : `status.${value}`)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {refreshProgress && (
            <span className="text-xs text-zinc-500">
              {refreshProgress.done}/{refreshProgress.total}
            </span>
          )}
          <button
            type="button"
            onClick={() => refreshAllMutation.mutate()}
            disabled={refreshAllMutation.isPending}
            className="rounded bg-zinc-800 px-3 py-1 text-sm text-zinc-300 disabled:opacity-50"
          >
            {t("library.refreshAll")}
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label={t("library.sort.label")}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`library.sort.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {["a", "b", "c", "d", "e", "f"].map((key) => (
            <div key={key} className="aspect-[2/3] animate-pulse rounded-lg bg-zinc-900" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center">
          <p className="text-zinc-400">{t("errors.generic")}</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="rounded bg-zinc-800 px-3 py-1.5 text-sm"
          >
            {t("errors.retry")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center">
          <h1 className="font-semibold text-2xl">{t("library.empty.title")}</h1>
          <p className="text-zinc-400">{t("library.empty.hint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((series) => (
            <SeriesCard
              key={series.id}
              series={series}
              onRemove={() => handleRemove(series.id, series.title)}
              onRefresh={() => refreshOneMutation.mutate(series.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
