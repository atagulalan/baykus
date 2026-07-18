import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getWatchHistory, removeLatestEpisodeWatch } from "../api/client.ts";
import type { WatchHistoryEntry } from "../api/types.ts";
import { EpisodeRow } from "../components/EpisodeRow.tsx";
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
 * Spec 010 WP2: Watch History split out of the WatchPage accordion into its own flat,
 * most-recent-first list. GET /api/watches/history already returns newest-first (E27), so
 * no client-side reverse is needed — the old accordion's `.reverse()` actually showed the
 * oldest-of-the-last-30 at the top, which this page corrects as a side effect of the split.
 */
export function WatchHistoryPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const pullRefresh = useLibrarySweepRefresh(["watch-history"]);

  const query = useQuery({
    queryKey: ["watch-history"],
    queryFn: () => getWatchHistory(),
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
        <h1 className="hidden font-display italic text-snow text-3xl tracking-tight sm:block">
          {t("watch.history")}
        </h1>

        {query.isLoading ? (
          <div className="h-48 animate-pulse bg-white/5" />
        ) : query.isError ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
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
          <p className="px-2 py-3 text-sm text-muted sm:px-6">{t("watch.empty.history")}</p>
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
