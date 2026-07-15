import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { addEpisodeWatch, getWatchHistory, listSeries } from "../api/client.ts";
import type { WatchHistoryEntry } from "../api/types.ts";
import { WatchNextRow } from "../components/WatchNextRow.tsx";
import { todayIso } from "../lib/date.ts";
import { useToast } from "../lib/toast.tsx";

function yesterdayIso(): string {
  const d = new Date(`${todayIso()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <p className="text-zinc-400">{t("errors.generic")}</p>
      <button type="button" onClick={onRetry} className="rounded bg-zinc-800 px-3 py-1.5 text-sm">
        {t("errors.retry")}
      </button>
    </div>
  );
}

function HistoryRow({ entry }: { entry: WatchHistoryEntry }) {
  const { t } = useTranslation();
  const date = entry.watchedAt.slice(0, 10);
  const time = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(entry.watchedAt),
  );
  const relativeDay =
    date === todayIso()
      ? t("watch.relativeDay.todayAt", { time })
      : date === yesterdayIso()
        ? t("watch.relativeDay.yesterdayAt", { time })
        : `${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(
            new Date(`${date}T00:00:00Z`),
          )} ${time}`;

  return (
    <div className="flex items-center justify-between gap-2 py-1 text-sm text-zinc-300">
      <span className="truncate">
        {entry.title} S{entry.s}E{entry.e}
        {entry.episodeTitle ? ` · ${entry.episodeTitle}` : ""}
      </span>
      <span className="shrink-0 text-xs text-zinc-500">{relativeDay}</span>
    </div>
  );
}

function HistorySection() {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: ["watch-history"], queryFn: () => getWatchHistory() });
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (!query.isLoading && !hasScrolledRef.current) {
      bottomRef.current?.scrollIntoView({ block: "end" });
      hasScrolledRef.current = true;
    }
  }, [query.isLoading]);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-medium text-sm text-zinc-300">{t("watch.history")}</h2>
      {query.isLoading ? (
        <div className="h-48 animate-pulse rounded-lg bg-zinc-900" />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : (query.data?.items.length ?? 0) === 0 ? (
        <p className="text-sm text-zinc-500">{t("watch.empty.history")}</p>
      ) : (
        <div className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
          {/* API returns newest-first; E27 renders oldest at top, newest at bottom. */}
          {[...(query.data?.items ?? [])].reverse().map((entry) => (
            <HistoryRow key={entry.watchId} entry={entry} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </section>
  );
}

export function WatchPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const libraryQuery = useQuery({ queryKey: ["library", "watch"], queryFn: () => listSeries() });

  const quickMark = useMutation({
    mutationFn: (episodeId: number) => addEpisodeWatch(episodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library"] });
      queryClient.invalidateQueries({ queryKey: ["watch-history"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
    onError: () => toast.show(t("errors.generic"), "error"),
  });

  const items = libraryQuery.data?.items ?? [];
  const watchNext = items.filter((s) => s.category === "watching");
  const notWatchedRecently = items.filter((s) => s.category === "not_watched_recently");

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-semibold text-2xl">{t("watch.title")}</h1>

      <HistorySection />

      <hr className="border-zinc-800" />

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-sm text-zinc-300">{t("watch.next")}</h2>
        {libraryQuery.isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-zinc-900" />
        ) : libraryQuery.isError ? (
          <ErrorState onRetry={() => libraryQuery.refetch()} />
        ) : watchNext.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("watch.empty.next")}</p>
        ) : (
          <div className="flex flex-col">
            {watchNext.map((series) => (
              <WatchNextRow
                key={series.id}
                series={series}
                onQuickMark={(episodeId) => quickMark.mutate(episodeId)}
              />
            ))}
          </div>
        )}
      </section>

      <hr className="border-zinc-800" />

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-sm text-zinc-300">{t("watch.notWatchedRecently")}</h2>
        {libraryQuery.isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-zinc-900" />
        ) : libraryQuery.isError ? (
          <ErrorState onRetry={() => libraryQuery.refetch()} />
        ) : notWatchedRecently.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("watch.empty.notWatchedRecently")}</p>
        ) : (
          <div className="flex flex-col">
            {notWatchedRecently.map((series) => (
              <WatchNextRow
                key={series.id}
                series={series}
                onQuickMark={(episodeId) => quickMark.mutate(episodeId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
