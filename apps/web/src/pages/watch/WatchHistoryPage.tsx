import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getWatchHistory, removeLatestEpisodeWatch } from "../../api/client.ts";
import type { WatchHistoryEntry } from "../../api/types.ts";
import { SectionPill } from "../../components/atoms/SectionPill/SectionPill.tsx";
import { SkeletonEpisodeList } from "../../components/atoms/Skeleton/Skeleton.tsx";
import { HistorySortToggle } from "../../components/layout/Layout/LayoutToggles.tsx";
import { PAGE_HEADING_ACTION_CLASS } from "../../components/layout/Layout/layoutShared.ts";
import { PageTitleRow } from "../../components/molecules/PageTitleRow/PageTitleRow.tsx";
import { EpisodeRow } from "../../components/organisms/EpisodeRow/EpisodeRow.tsx";
import { todayIso } from "../../lib/date.ts";
import { useToast } from "../../lib/toast.tsx";

function yesterdayIso(): string {
  const d = new Date(`${todayIso()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function formatHistoryDayTime(
  date: string,
  time: string,
  locale: string,
  currentYear: number,
): string {
  const watchYear = Number(date.slice(0, 4));
  const includeYear = watchYear !== currentYear;
  const datePart = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(new Date(`${date}T00:00:00Z`));
  return includeYear ? datePart : `${datePart} ${time}`;
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
  const { t, i18n } = useTranslation();
  const locale =
    i18n.language === "en" ? "en-US" : i18n.language === "ja" ? "ja-JP" : "tr-TR";
  const currentYear = Number(todayIso().slice(0, 4));
  const date = entry.watchedAt.slice(0, 10);
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(entry.watchedAt));
  const relativeDay =
    date === todayIso()
      ? t("watch.relativeDay.todayAt", { time })
      : date === yesterdayIso()
        ? t("watch.relativeDay.yesterdayAt", { time })
        : formatHistoryDayTime(date, time, locale, currentYear);

  return (
    <EpisodeRow
      embedded
      posterStretch
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
  const { order: searchOrder } = useSearch({ from: "/watch/history" });
  const order = searchOrder ?? "newest";

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
    <section className="page-top-flush flex flex-col gap-3 sm:px-3 lg:px-0">
      <PageTitleRow action={<HistorySortToggle className={PAGE_HEADING_ACTION_CLASS} />}>
        {t("watch.history")}
      </PageTitleRow>

      {query.isLoading ? (
        <SkeletonEpisodeList rows={6} />
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
        <p className="list-inset py-3 text-sm text-muted">{t("watch.empty.history")}</p>
      ) : (
        <div className="flex flex-col gap-0">
          <div
            className="sticky z-30 flex justify-center py-1 list-inset"
            style={{ top: "var(--app-header-height, 4rem)" }}
          >
            <SectionPill className="text-sm font-semibold text-snow">
              {t("watch.history")}
            </SectionPill>
          </div>
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
        </div>
      )}
    </section>
  );
}
