import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { History } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import { addEpisodeWatch, listSeries } from "../api/client.ts";
import type { WatchCategory } from "../api/types.ts";
import { AddSectionBar } from "../components/AddSectionBar.tsx";
import { CategoryListSection } from "../components/CategoryListSection.tsx";
import type { LibrarySort } from "../components/FilterPanel.tsx";
import { PullToRefresh, useLibrarySweepRefresh } from "../components/PullToRefresh.tsx";
import { RemoveSectionDialog } from "../components/RemoveSectionDialog.tsx";
import { groupByCategory } from "../lib/groupByCategory.ts";
import { useToast } from "../lib/toast.tsx";
import { readUiPrefs, sectionSort, updateUiPrefs } from "../lib/uiPrefs.ts";

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

const LIBRARY_QUERY_KEY = ["library", "browse"] as const;

/** Spec 010 WP2: Watch History lives at its own route (`/watch/history`) — this page only
 * renders the category sections, with a history icon entry point up top. */
export function WatchPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const nextHeadingRef = useRef<HTMLHeadingElement>(null);
  const hasScrolledRef = useRef(false);

  const initial = readUiPrefs();
  const [sections, setSections] = useState<WatchCategory[]>(() => initial.watchSections);
  const [sectionSorts, setSectionSorts] = useState(() => initial.watchSectionSorts);
  const [pendingRemove, setPendingRemove] = useState<WatchCategory | null>(null);

  const libraryQuery = useQuery({
    queryKey: LIBRARY_QUERY_KEY,
    queryFn: () => listSeries(),
  });
  const pullRefresh = useLibrarySweepRefresh(["watch-history"]);

  // E137: marking is in-flight state for the row's own checkbox transition — no longer
  // coordinated with a history landing spot since history moved off this page (WP2).
  const [flyItemId, setFlyItemId] = useState<number | null>(null);

  const quickMark = useMutation({
    mutationFn: ({ episodeId }: { episodeId: number; itemId: number }) =>
      addEpisodeWatch(episodeId),
    onMutate: ({ itemId }) => setFlyItemId(itemId),
    onSuccess: async (_result, { itemId }) => {
      try {
        const library = await listSeries();
        // Anchor on the non-sticky <section> wrapper: the sticky h2 pins its
        // rect while stuck, so it can't measure how far content above shifted.
        const anchor = nextHeadingRef.current?.closest("section") ?? nextHeadingRef.current;
        const applyAnchored = () => {
          const anchorTopBefore = anchor?.getBoundingClientRect().top;
          flushSync(() => {
            queryClient.setQueryData(LIBRARY_QUERY_KEY, library);
            setFlyItemId((prev) => (prev === itemId ? null : prev));
          });
          if (anchor && anchorTopBefore !== undefined) {
            window.scrollBy(0, anchor.getBoundingClientRect().top - anchorTopBefore);
          }
        };
        if (document.startViewTransition) {
          document.startViewTransition(applyAnchored);
        } else {
          applyAnchored();
        }
      } catch {
        setFlyItemId(null);
        queryClient.invalidateQueries({ queryKey: ["library"] });
      }
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["watch-history"] });
    },
    onError: (_error, { itemId }) => {
      setFlyItemId((prev) => (prev === itemId ? null : prev));
      toast.show(t("errors.generic"), "error");
    },
  });

  useEffect(() => {
    if (!libraryQuery.isLoading && !hasScrolledRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          nextHeadingRef.current?.scrollIntoView({ block: "start" });
        });
      });
      hasScrolledRef.current = true;
    }
  }, [libraryQuery.isLoading]);

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

  const byCategory = groupByCategory(libraryQuery.data?.items ?? []);
  const isMarking = (itemId: number) => flyItemId === itemId;
  const anchorCategory = sections.find((c) => c === "watching") ?? sections[0] ?? null;

  return (
    <PullToRefresh onRefresh={pullRefresh}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl italic tracking-tight text-snow">
            {t("watch.title")}
          </h1>
          <Link
            to="/watch/history"
            aria-label={t("watch.history")}
            title={t("watch.history")}
            className="flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-snow"
          >
            <History size={20} strokeWidth={1.75} />
          </Link>
        </div>

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
