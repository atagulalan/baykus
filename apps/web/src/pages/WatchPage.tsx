import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  addEpisodeWatch,
  getWatchHistory,
  listSeries,
  removeLatestEpisodeWatch,
} from "../api/client.ts";
import type { WatchCategory, WatchHistoryEntry, WatchHistoryResponse } from "../api/types.ts";
import { AddSectionBar } from "../components/AddSectionBar.tsx";
import { CategoryListSection } from "../components/CategoryListSection.tsx";
import { EpisodeRow } from "../components/EpisodeRow.tsx";
import type { LibrarySort } from "../components/FilterPanel.tsx";
import { PullToRefresh, useLibrarySweepRefresh } from "../components/PullToRefresh.tsx";
import { RemoveSectionDialog } from "../components/RemoveSectionDialog.tsx";
import { todayIso } from "../lib/date.ts";
import { groupByCategory } from "../lib/groupByCategory.ts";
import { useToast } from "../lib/toast.tsx";
import { readUiPrefs, sectionSort, updateUiPrefs } from "../lib/uiPrefs.ts";

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
        className="border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-snow"
      >
        {t("errors.retry")}
      </button>
    </div>
  );
}

function HistoryRow({
  entry,
  transitionName,
  onUnwatch,
  unwatching,
}: {
  entry: WatchHistoryEntry;
  transitionName?: string | undefined;
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
      {...(transitionName ? { transitionName } : {})}
    />
  );
}

function HistorySection({
  query,
  flyWatchId,
  collapsed,
  onToggle,
  onUnwatch,
  unwatchingEpisodeId,
}: {
  query: ReturnType<typeof useQuery<WatchHistoryResponse>>;
  flyWatchId: number | null;
  collapsed: boolean;
  onToggle: () => void;
  onUnwatch: (episodeId: number) => void;
  unwatchingEpisodeId: number | null;
}) {
  const { t } = useTranslation();
  const items = query.data?.items;
  const count = items?.length ?? 0;

  return (
    <section className="flex flex-col gap-1">
      <h2
        style={{
          top: "var(--app-header-height, 3.5rem)",
          scrollMarginTop: "var(--app-header-height, 3.5rem)",
        }}
        className="sticky z-30 -mx-3 border-b border-white/5 bg-void/95 backdrop-blur sm:-mx-6"
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex min-h-11 w-full items-center gap-2 px-5 py-2.5 text-left sm:px-12"
        >
          <span className="font-semibold text-base text-snow">{t("watch.history")}</span>
          {collapsed && flyWatchId !== null && (
            // E137: invisible row-wide landing strip at the closed header's bottom
            // edge — the marked row slides up into the header line and fades out.
            // Exists only while the transition runs.
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0"
              style={{ viewTransitionName: "quickmark-fly" }}
            />
          )}
          <ChevronDown
            size={16}
            strokeWidth={1.75}
            className={`ml-auto shrink-0 text-muted transition-transform duration-200 ${
              collapsed ? "-rotate-90" : ""
            }`}
            aria-hidden="true"
          />
        </button>
      </h2>

      {/* No CSS height transition: toggleHistory anchors "İzleniyor" via
          scrollBy inside a view transition, which needs the final layout in
          the same frame — a gradual grid-rows tween would defeat both. */}
      <div className="grid" style={{ gridTemplateRows: collapsed ? "0fr" : "1fr" }}>
        <div className="overflow-hidden">
          {query.isLoading ? (
            <div className="h-48 animate-pulse bg-white/5" />
          ) : query.isError ? (
            <ErrorState onRetry={() => query.refetch()} />
          ) : count === 0 ? (
            <p className="px-2 py-3 text-sm text-muted sm:px-6">{t("watch.empty.history")}</p>
          ) : (
            <div className="flex flex-col" data-watch-history-list>
              {[...(items ?? [])].reverse().map((entry) => (
                <HistoryRow
                  key={entry.watchId}
                  entry={entry}
                  // E137: a clipped row inside the collapsed 0fr container must never
                  // be the fly target (broken morph + duplicate name with the strip).
                  transitionName={
                    !collapsed && entry.watchId === flyWatchId ? "quickmark-fly" : undefined
                  }
                  onUnwatch={onUnwatch}
                  unwatching={unwatchingEpisodeId === entry.episodeId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const LIBRARY_QUERY_KEY = ["library", "browse"] as const;

export function WatchPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const nextHeadingRef = useRef<HTMLHeadingElement>(null);
  const hasScrolledRef = useRef(false);

  const initial = readUiPrefs();
  const [sections, setSections] = useState<WatchCategory[]>(() => initial.watchSections);
  const [sectionSorts, setSectionSorts] = useState(() => initial.watchSectionSorts);
  const [historyCollapsed, setHistoryCollapsed] = useState(() => initial.historyCollapsed);
  const [pendingRemove, setPendingRemove] = useState<WatchCategory | null>(null);

  const historyQuery = useQuery({
    queryKey: ["watch-history"],
    queryFn: () => getWatchHistory(),
  });
  const libraryQuery = useQuery({
    queryKey: LIBRARY_QUERY_KEY,
    queryFn: () => listSeries(),
  });
  const pullRefresh = useLibrarySweepRefresh(["watch-history"]);

  const [fly, setFly] = useState<{
    itemId: number;
    watchId: number | null;
  } | null>(null);

  const unwatch = useMutation({
    mutationFn: (episodeId: number) => removeLatestEpisodeWatch(episodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-history"] });
      queryClient.invalidateQueries({ queryKey: ["library"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
    onError: () => toast.show(t("errors.generic"), "error"),
  });

  const quickMark = useMutation({
    mutationFn: ({ episodeId }: { episodeId: number; itemId: number }) =>
      addEpisodeWatch(episodeId),
    onMutate: ({ itemId }) => setFly({ itemId, watchId: null }),
    onSuccess: async (result, { itemId }) => {
      try {
        const [history, library] = await Promise.all([getWatchHistory(), listSeries()]);
        // Anchor on the non-sticky <section> wrapper: the sticky h2 pins its
        // rect while stuck, so it can't measure how far content above shifted.
        const anchor = nextHeadingRef.current?.closest("section") ?? nextHeadingRef.current;
        const applyAnchored = () => {
          const anchorTopBefore = anchor?.getBoundingClientRect().top;
          flushSync(() => {
            queryClient.setQueryData(["watch-history"], history);
            queryClient.setQueryData(LIBRARY_QUERY_KEY, library);
            setFly((prev) => (prev?.itemId === itemId ? { itemId, watchId: result.id } : prev));
          });
          if (anchor && anchorTopBefore !== undefined) {
            window.scrollBy(0, anchor.getBoundingClientRect().top - anchorTopBefore);
          }
        };
        const clearFly = () => setFly((prev) => (prev?.watchId === result.id ? null : prev));
        if (document.startViewTransition) {
          const transition = document.startViewTransition(applyAnchored);
          transition.finished.then(clearFly, clearFly);
        } else {
          applyAnchored();
          clearFly();
        }
      } catch {
        setFly(null);
        queryClient.invalidateQueries({ queryKey: ["library"] });
        queryClient.invalidateQueries({ queryKey: ["watch-history"] });
      }
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
    onError: (_error, { itemId }) => {
      setFly((prev) => (prev?.itemId === itemId && prev.watchId === null ? null : prev));
      toast.show(t("errors.generic"), "error");
    },
  });

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

  function updateSections(next: WatchCategory[]) {
    // E141: `watching` is always present — pin it at the front if missing.
    const pinned = next.includes("watching") ? next : (["watching", ...next] as WatchCategory[]);
    setSections(pinned);
    updateUiPrefs({ watchSections: pinned });
  }

  function setSortFor(category: WatchCategory, sort: LibrarySort) {
    const next = { ...sectionSorts, [category]: sort };
    setSectionSorts(next);
    updateUiPrefs({ watchSectionSorts: next });
  }

  function requestRemove(category: WatchCategory) {
    if (category === "watching") return;
    if (readUiPrefs().skipSectionRemoveConfirm) {
      updateSections(sections.filter((x) => x !== category));
      return;
    }
    setPendingRemove(category);
  }

  function confirmRemove(dontShowAgain: boolean) {
    if (pendingRemove === null || pendingRemove === "watching") return;
    if (dontShowAgain) updateUiPrefs({ skipSectionRemoveConfirm: true });
    updateSections(sections.filter((x) => x !== pendingRemove));
    setPendingRemove(null);
  }

  function toggleHistory() {
    const opening = historyCollapsed;
    const next = !historyCollapsed;
    updateUiPrefs({ historyCollapsed: next });
    // Same anchoring as quick-mark: keep the "İzleniyor" section visually
    // pinned so the accordion reads as growing/shrinking upward, not pushing
    // the page around. Anchor the non-sticky <section> (see quickMark note).
    // When opening, peek ~1.5 history rows above that pin so the new list
    // isn't entirely off-screen.
    const anchor = nextHeadingRef.current?.closest("section") ?? nextHeadingRef.current;
    const apply = () => {
      const anchorTopBefore = anchor?.getBoundingClientRect().top;
      flushSync(() => setHistoryCollapsed(next));
      if (anchor && anchorTopBefore !== undefined) {
        let delta = anchor.getBoundingClientRect().top - anchorTopBefore;
        if (opening) {
          const row = document.querySelector("[data-watch-history-list] > *");
          const rowH = row?.getBoundingClientRect().height || 72;
          delta -= 1 * rowH;
        }
        window.scrollBy(0, delta);
      }
    };
    if (document.startViewTransition) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  }

  const byCategory = groupByCategory(libraryQuery.data?.items ?? []);
  const isMarking = (itemId: number) =>
    fly !== null && fly.itemId === itemId && fly.watchId === null;
  const anchorCategory = sections.find((c) => c === "watching") ?? sections[0] ?? null;

  return (
    <PullToRefresh onRefresh={pullRefresh}>
      <div className="flex flex-col gap-6">
        <h1 className="hidden font-display text-2xl italic tracking-tight text-snow sm:block">
          {t("watch.title")}
        </h1>

        <HistorySection
          query={historyQuery}
          flyWatchId={fly?.watchId ?? null}
          collapsed={historyCollapsed}
          onToggle={toggleHistory}
          onUnwatch={(episodeId) => unwatch.mutate(episodeId)}
          unwatchingEpisodeId={unwatch.isPending ? (unwatch.variables ?? null) : null}
        />

        {libraryQuery.isLoading ? (
          <div className="h-32 animate-pulse bg-white/5" />
        ) : libraryQuery.isError ? (
          <ErrorState onRetry={() => libraryQuery.refetch()} />
        ) : (
          <>
            {sections.map((c) => (
              <CategoryListSection
                key={c}
                category={c}
                items={byCategory.get(c) ?? []}
                sort={sectionSort(sectionSorts, c)}
                onSortChange={(sort) => setSortFor(c, sort)}
                removable={c !== "watching"}
                onRemove={() => requestRemove(c)}
                {...(c === anchorCategory ? { headingRef: nextHeadingRef } : {})}
                isMarking={isMarking}
                onQuickMark={(episodeId, itemId) => quickMark.mutate({ episodeId, itemId })}
              />
            ))}
            <AddSectionBar present={sections} onAdd={(c) => updateSections([...sections, c])} />
          </>
        )}
      </div>

      {pendingRemove !== null && (
        <RemoveSectionDialog
          category={pendingRemove}
          onClose={() => setPendingRemove(null)}
          onConfirm={confirmRemove}
        />
      )}
    </PullToRefresh>
  );
}
