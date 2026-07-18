import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getWatchHistory, removeLatestEpisodeWatch } from "../api/client.ts";
import type { WatchHistoryEntry } from "../api/types.ts";
import { EpisodeRow } from "../components/EpisodeRow.tsx";
import { PageTitle } from "../components/PageTitle.tsx";
import { PullToRefresh, useLibrarySweepRefresh } from "../components/PullToRefresh.tsx";
import { todayIso } from "../lib/date.ts";
import { useToast } from "../lib/toast.tsx";

function yesterdayIso(): string {
  const d = new Date(`${todayIso()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function HistoryRow({
  entry,
  onUnwatch,
  unwatching,
}: {
  entry: WatchHistoryEntry;
  onUnwatch: (episodeId: number) => void;
  unwatching: boolean;
}) {
  const { t } = useTranslation();
  const date = entry.watchedAt.slice(0, 10);
  const time = new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(entry.watchedAt));
  const relativeDay =
    date === todayIso()
      ? t("watch.relativeDay.todayAt", { time })
      : date === yesterdayIso()
        ? t("watch.relativeDay.yesterdayAt", { time })
        : `${new Intl.DateTimeFormat("tr-TR", {
            day: "numeric",
            month: "short",
          }).format(new Date(`${date}T00:00:00Z`))} ${time}`;

  return (
    <EpisodeRow
      itemId={entry.itemId}
      seriesTitle={entry.title}
      posterRef={entry.posterRef}
      s={entry.s}
      e={entry.e}
      episodeTitle={entry.episodeTitle}
      airDate={entry.airDate}
      episodeType={entry.episodeType}
      detailsEpisodeId={entry.episodeId}
      watched
      lastWatchedAt={entry.watchedAt}
      onToggleWatch={() => onUnwatch(entry.episodeId)}
      checkboxDisabled={unwatching}
      trailing={<span className="shrink-0 text-xs text-muted">{relativeDay}</span>}
    />
  );
}

/**
 * Spec 010 WP2: Watch History on its own route. Default is newest-first (E27);
 * the sort toggle refetches with `order=oldest` so the window is the earliest
 * watches, not a client reverse of the latest 30 (011 E159).
 */
export function WatchHistoryPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const pullRefresh = useLibrarySweepRefresh(["watch-history"]);
  const [oldestFirst, setOldestFirst] = useState(false);
  const order = oldestFirst ? "oldest" : "newest";

  const query = useQuery({
    queryKey: ["watch-history", order],
    queryFn: () => getWatchHistory({ order }),
  });

  const unwatch = useMutation({
    mutationFn: (episodeId: number) => removeLatestEpisodeWatch(episodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-history"] });
      queryClient.invalidateQueries({ queryKey: ["library"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
    onError: () => toast.show(t("errors.generic"), "error"),
  });

  const items = query.data?.items ?? [];
  const unwatchingEpisodeId = unwatch.isPending ? (unwatch.variables ?? null) : null;

  return (
    <PullToRefresh onRefresh={pullRefresh}>
      <section className="flex flex-col gap-6">
        <div className="content-inset flex items-center">
          <div className="hidden sm:block">
            <PageTitle>{t("watch.history")}</PageTitle>
          </div>
          <button
            type="button"
            onClick={() => setOldestFirst((v) => !v)}
            aria-label={t("library.filter.sortTitle")}
            title={t("library.filter.sortTitle")}
            aria-pressed={oldestFirst}
            className={`ml-auto flex h-9 w-9 items-center justify-center transition-colors hover:text-snow ${
              oldestFirst ? "text-yellow" : "text-muted"
            }`}
          >
            <ArrowUpDown size={20} strokeWidth={1.75} />
          </button>
        </div>

        {query.isLoading ? (
          <div className="content-inset">
            <div className="h-48 animate-pulse bg-white/5" />
          </div>
        ) : query.isError ? (
          <div className="content-inset flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-muted">{t("errors.generic")}</p>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-snow"
            >
              {t("errors.retry")}
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted sm:px-4">{t("watch.empty.history")}</p>
        ) : (
          <div className="flex flex-col">
            {items.map((entry) => (
              <HistoryRow
                key={entry.watchId}
                entry={entry}
                onUnwatch={(episodeId) => unwatch.mutate(episodeId)}
                unwatching={unwatchingEpisodeId === entry.episodeId}
              />
            ))}
          </div>
        )}
      </section>
    </PullToRefresh>
  );
}
