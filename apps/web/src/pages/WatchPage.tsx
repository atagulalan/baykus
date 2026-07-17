import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { type Ref, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { addEpisodeWatch, getWatchHistory, listSeries } from "../api/client.ts";
import type { WatchHistoryEntry, WatchHistoryResponse } from "../api/types.ts";
import { EpisodeRow, WatchNextRow } from "../components/WatchNextRow.tsx";
import { CATEGORY_ICONS } from "../lib/categoryIcons.ts";
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
      <p className="text-muted">{t("errors.generic")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="border border-white/10 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-snow px-3 py-1.5 transition-colors"
      >
        {t("errors.retry")}
      </button>
    </div>
  );
}

/** Sticky section label aligned with EpisodeRow content (E129). */
function SectionHeader({
  title,
  count,
  icon: Icon,
  headingRef,
}: {
  title: string;
  count?: number | undefined;
  icon?: LucideIcon | undefined;
  headingRef?: Ref<HTMLHeadingElement> | undefined;
}) {
  return (
    <h2
      ref={headingRef}
      // Inline top/scroll-margin: Tailwind arbitrary values break on the comma inside
      // var(--x, fallback), so the sticky offset never applied and headers slid under the nav.
      style={{
        top: "var(--app-header-height, 3.5rem)",
        scrollMarginTop: "var(--app-header-height, 3.5rem)",
      }}
      className="sticky z-30 flex items-center gap-2 border-b border-white/5 bg-void/95 px-2 py-2.5 backdrop-blur sm:px-6"
    >
      {Icon ? <Icon size={16} strokeWidth={1.75} className="shrink-0 text-muted" /> : null}
      <span className="font-semibold text-base text-snow">{title}</span>
      {count !== undefined ? (
        <span className="font-mono text-sm tabular-nums text-muted">({count})</span>
      ) : null}
    </h2>
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
    <EpisodeRow
      itemId={entry.itemId}
      posterRef={entry.posterRef}
      title={entry.title}
      s={entry.s}
      e={entry.e}
      episodeTitle={entry.episodeTitle}
      airDate={entry.airDate}
      episodeType={entry.episodeType}
      trailing={<span className="shrink-0 text-xs text-muted">{relativeDay}</span>}
    />
  );
}

function HistorySection({ query }: { query: ReturnType<typeof useQuery<WatchHistoryResponse>> }) {
  const { t } = useTranslation();
  const items = query.data?.items;
  const count = query.isLoading || query.isError ? undefined : (items?.length ?? 0);

  return (
    <section className="flex flex-col gap-1">
      <SectionHeader title={t("watch.history")} count={count} />
      {query.isLoading ? (
        <div className="h-48 animate-pulse bg-white/5" />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : (items?.length ?? 0) === 0 ? (
        <p className="px-2 text-sm text-muted sm:px-6">{t("watch.empty.history")}</p>
      ) : (
        <div className="flex flex-col">
          {/* API returns newest-first; E27 renders oldest at top, newest at bottom. */}
          {[...(items ?? [])].reverse().map((entry) => (
            <HistoryRow key={entry.watchId} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}

export function WatchPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const nextHeadingRef = useRef<HTMLHeadingElement>(null);
  const hasScrolledRef = useRef(false);

  const historyQuery = useQuery({ queryKey: ["watch-history"], queryFn: () => getWatchHistory() });
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

  // One-shot anchor to "Sıradaki bölümler" once both sections have settled — mirrors the
  // calendar timeline's today-anchor pattern (E38, replaces the old history bottom-anchor).
  useEffect(() => {
    if (!historyQuery.isLoading && !libraryQuery.isLoading && !hasScrolledRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          nextHeadingRef.current?.scrollIntoView({ block: "start" });
        });
      });
      hasScrolledRef.current = true;
    }
  }, [historyQuery.isLoading, libraryQuery.isLoading]);

  const items = libraryQuery.data?.items ?? [];
  const watchNext = items.filter((s) => s.category === "watching");
  const notWatchedRecently = items.filter((s) => s.category === "not_watched_recently");
  const librarySettled = !libraryQuery.isLoading && !libraryQuery.isError;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl italic tracking-tight text-snow">{t("watch.title")}</h1>

      <HistorySection query={historyQuery} />

      <section className="flex flex-col gap-1">
        <SectionHeader
          title={t("watch.next")}
          count={librarySettled ? watchNext.length : undefined}
          icon={CATEGORY_ICONS.watching}
          headingRef={nextHeadingRef}
        />
        {libraryQuery.isLoading ? (
          <div className="h-32 animate-pulse bg-white/5" />
        ) : libraryQuery.isError ? (
          <ErrorState onRetry={() => libraryQuery.refetch()} />
        ) : watchNext.length === 0 ? (
          <p className="px-2 text-sm text-muted sm:px-6">{t("watch.empty.next")}</p>
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

      <section className="flex flex-col gap-1">
        <SectionHeader
          title={t("watch.notWatchedRecently")}
          count={librarySettled ? notWatchedRecently.length : undefined}
          icon={CATEGORY_ICONS.not_watched_recently}
        />
        {libraryQuery.isLoading ? (
          <div className="h-32 animate-pulse bg-white/5" />
        ) : libraryQuery.isError ? (
          <ErrorState onRetry={() => libraryQuery.refetch()} />
        ) : notWatchedRecently.length === 0 ? (
          <p className="px-2 text-sm text-muted sm:px-6">{t("watch.empty.notWatchedRecently")}</p>
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
