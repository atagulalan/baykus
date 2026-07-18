import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import { addEpisodeWatch, listSeries } from "../api/client.ts";
import type { WatchCategory } from "../api/types.ts";
import { AddSectionBar } from "../components/AddSectionBar.tsx";
import { CategoryListSection } from "../components/CategoryListSection.tsx";
import type { LibrarySort } from "../components/FilterPanel.tsx";
import { PageTitle } from "../components/PageTitle.tsx";
import { PullToRefresh } from "../components/PullToRefresh.tsx";
import { RemoveSectionDialog } from "../components/RemoveSectionDialog.tsx";
import { groupByCategory } from "../lib/groupByCategory.ts";
import { useToast } from "../lib/toast.tsx";
import {
  ensurePinnedWatchSections,
  readUiPrefs,
  sectionSort,
  updateUiPrefs,
} from "../lib/uiPrefs.ts";

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="content-inset flex flex-col items-center gap-2 py-12 text-center">
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
 * renders the category sections. History opens via pull-to-history (E160). Opens at the
 * top (no scroll-past-history anchor — history left the page). */
export function WatchPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  /** Quick-mark scroll compensation only — not used for initial page positioning. */
  const nextHeadingRef = useRef<HTMLHeadingElement>(null);

  const initial = readUiPrefs();
  const [sections, setSections] = useState<WatchCategory[]>(() => initial.watchSections);
  const [sectionSorts, setSectionSorts] = useState(() => initial.watchSectionSorts);
  const [pendingRemove, setPendingRemove] = useState<WatchCategory | null>(null);

  const libraryQuery = useQuery({
    queryKey: LIBRARY_QUERY_KEY,
    queryFn: () => listSeries(),
  });

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

  function updateSections(next: WatchCategory[]) {
    // E141: `watching` is always present; `needs_review` is auto-shown when non-empty (E156).
    const pinned = ensurePinnedWatchSections(next);
    setSections(pinned);
    updateUiPrefs({ watchSections: pinned });
  }

  function setSortFor(category: WatchCategory, sort: LibrarySort) {
    const next = { ...sectionSorts, [category]: sort };
    setSectionSorts(next);
    updateUiPrefs({ watchSectionSorts: next });
  }

  function requestRemove(category: WatchCategory) {
    if (category === "watching" || category === "needs_review") return;
    if (readUiPrefs().skipSectionRemoveConfirm) {
      updateSections(sections.filter((x) => x !== category));
      return;
    }
    setPendingRemove(category);
  }

  function confirmRemove(dontShowAgain: boolean) {
    if (
      pendingRemove === null ||
      pendingRemove === "watching" ||
      pendingRemove === "needs_review"
    ) {
      return;
    }
    if (dontShowAgain) updateUiPrefs({ skipSectionRemoveConfirm: true });
    updateSections(sections.filter((x) => x !== pendingRemove));
    setPendingRemove(null);
  }

  const byCategory = groupByCategory(libraryQuery.data?.items ?? []);
  const isMarking = (itemId: number) => flyItemId === itemId;
  // E156: prepend needs_review only when it has next-up rows; never store it in section prefs.
  const needsReviewItems = byCategory.get("needs_review") ?? [];
  const showNeedsReview = needsReviewItems.some((s) => s.nextUnwatched != null);
  const sectionsToRender: WatchCategory[] = showNeedsReview
    ? ["needs_review", ...sections]
    : sections;
  const anchorCategory =
    sectionsToRender.find((c) => c === "watching") ?? sectionsToRender[0] ?? null;

  return (
    <PullToRefresh
      variant="history"
      onOpen={() => {
        void navigate({ to: "/watch/history" });
      }}
    >
      <div className="flex flex-col gap-6">
        <div className="content-inset flex items-center">
          <PageTitle>{t("watch.title")}</PageTitle>
          <button
            type="button"
            onClick={() => {
              updateUiPrefs({ browseView: "grid" });
              void navigate({ to: "/" });
            }}
            aria-label={t("library.view.grid")}
            title={t("library.view.grid")}
            className="ml-auto hidden h-9 w-9 items-center justify-center text-muted transition-colors hover:text-snow sm:flex"
          >
            <LayoutGrid size={20} strokeWidth={1.5} />
          </button>
        </div>

        {libraryQuery.isLoading ? (
          <div className="content-inset">
            <div className="h-32 animate-pulse bg-white/5" />
          </div>
        ) : libraryQuery.isError ? (
          <ErrorState onRetry={() => libraryQuery.refetch()} />
        ) : (
          <>
            {sectionsToRender.map((c) => (
              <CategoryListSection
                key={c}
                category={c}
                items={byCategory.get(c) ?? []}
                sort={sectionSort(sectionSorts, c)}
                onSortChange={(sort) => setSortFor(c, sort)}
                removable={c !== "watching" && c !== "needs_review"}
                onRemove={() => requestRemove(c)}
                {...(c === anchorCategory ? { headingRef: nextHeadingRef } : {})}
                isMarking={isMarking}
                onQuickMark={(episodeId, itemId) => quickMark.mutate({ episodeId, itemId })}
              />
            ))}
            <AddSectionBar
              present={sectionsToRender}
              onAdd={(c) => updateSections([...sections, c])}
            />
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
