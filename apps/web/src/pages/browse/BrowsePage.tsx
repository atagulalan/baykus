import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutGrid, List } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import { addEpisodeWatch, getAuthSession, listSeries } from "../../api/client.ts";
import type { BrowseView, WatchCategory } from "../../api/types.ts";
import {
  SkeletonCategoryGrid,
  SkeletonEpisodeList,
} from "../../components/atoms/Skeleton/Skeleton.tsx";
import { PAGE_HEADING_ACTION_CLASS } from "../../components/layout/Layout/layoutShared.ts";
import { AddSectionBar } from "../../components/molecules/AddSectionBar/AddSectionBar.tsx";
import { PageTitleRow } from "../../components/molecules/PageTitleRow/PageTitleRow.tsx";
import { PullToRefresh } from "../../components/molecules/PullToRefresh/PullToRefresh.tsx";
import { CategoryListSection } from "../../components/organisms/CategoryListSection/CategoryListSection.tsx";
import { CategorySection } from "../../components/organisms/CategorySection/CategorySection.tsx";
import { groupByCategory } from "../../lib/groupByCategory.ts";
import type { LibrarySort } from "../../lib/librarySort.ts";
import { pageViewTransition } from "../../lib/pageViewTransition.ts";
import { clearLastPosterItemId } from "../../lib/posterTransition.ts";
import { selfHandleParam } from "../../lib/profilePath.ts";
import { maybeStartSweep, useSweepProgress } from "../../lib/staleSweep.ts";
import { useToast } from "../../lib/toast.tsx";
import {
  ensurePinnedWatchSections,
  readUiPrefs,
  sectionSort,
  updateUiPrefs,
} from "../../lib/uiPrefs.ts";
import { navigateBrowseView } from "./navigateBrowseView.ts";

const LIBRARY_QUERY_KEY = ["library", "browse"] as const;

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

/** Shared browse shell — grid (`/`) and list (`/watch`) differ only in section body. */
export function BrowsePage({ view }: { view: BrowseView }) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const sweepProgress = useSweepProgress();
  const sessionQuery = useQuery({ queryKey: ["auth-session"], queryFn: getAuthSession });
  const nextHeadingRef = useRef<HTMLHeadingElement>(null);

  const initial = readUiPrefs();
  const [sections, setSections] = useState<WatchCategory[]>(() => initial.watchSections);
  const [sectionSorts, setSectionSorts] = useState(() => initial.watchSectionSorts);
  const [collapsedSections, setCollapsedSections] = useState<WatchCategory[]>([]);
  const [flyItemId, setFlyItemId] = useState<number | null>(null);

  const libraryQuery = useQuery({
    queryKey: LIBRARY_QUERY_KEY,
    queryFn: () => listSeries(),
  });

  useEffect(() => {
    if (view !== "grid") return;
    maybeStartSweep({
      onComplete: () => queryClient.invalidateQueries({ queryKey: ["library"] }),
    });
  }, [queryClient, view]);

  const quickMark = useMutation({
    mutationFn: ({ episodeId }: { episodeId: number; itemId: number }) =>
      addEpisodeWatch(episodeId),
    onMutate: ({ itemId }) => setFlyItemId(itemId),
    onSuccess: async (_result, { itemId }) => {
      try {
        const library = await listSeries();
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
    const pinned = ensurePinnedWatchSections(next);
    setSections(pinned);
    updateUiPrefs({ watchSections: pinned });
  }

  function setSortFor(category: WatchCategory, sort: LibrarySort) {
    const next = { ...sectionSorts, [category]: sort };
    setSectionSorts(next);
    updateUiPrefs({ watchSectionSorts: next });
  }

  function toggleSection(category: WatchCategory) {
    setCollapsedSections((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  }

  const byCategory = groupByCategory(libraryQuery.data?.items ?? []);
  const items = libraryQuery.data?.items ?? [];
  const isMarking = (itemId: number) => flyItemId === itemId;
  const needsReviewItems = byCategory.get("needs_review") ?? [];
  const showNeedsReview = needsReviewItems.some((s) => s.nextUnwatched != null);
  const sectionsToRender: WatchCategory[] = showNeedsReview
    ? ["needs_review", ...sections]
    : sections;
  const anchorCategory =
    sectionsToRender.find((c) => c === "watching") ?? sectionsToRender[0] ?? null;
  const hasVisibleGridItems = sectionsToRender.some((c) => (byCategory.get(c)?.length ?? 0) > 0);
  const hasVisibleListItems = sectionsToRender.some((c) =>
    (byCategory.get(c) ?? []).some((s) => s.nextUnwatched != null),
  );
  const isGrid = view === "grid";
  const destinationView: BrowseView = isGrid ? "list" : "grid";
  const ViewIcon = isGrid ? List : LayoutGrid;
  const viewLabel = t(isGrid ? "library.view.list" : "library.view.grid");

  return (
    <PullToRefresh
      variant="history"
      onOpen={() => {
        clearLastPosterItemId();
        void navigate({ to: "/watch/history", viewTransition: pageViewTransition });
      }}
    >
      <section className="flex flex-col gap-3">
        {isGrid && sweepProgress && (
          <p className="list-inset font-mono text-[10px] uppercase tracking-widest text-muted">
            {t("library.sweep.progress", { done: sweepProgress.done, total: sweepProgress.total })}
          </p>
        )}

        <PageTitleRow
          action={
            <button
              type="button"
              onClick={() => navigateBrowseView(navigate, destinationView)}
              aria-label={viewLabel}
              title={viewLabel}
              className={PAGE_HEADING_ACTION_CLASS}
            >
              <ViewIcon size={20} strokeWidth={1.5} />
            </button>
          }
        >
          {t(isGrid ? "app.nav.library" : "watch.title")}
        </PageTitleRow>

        {libraryQuery.isLoading ? (
          isGrid ? (
            <SkeletonCategoryGrid sections={2} />
          ) : (
            <div className="flex flex-col gap-6">
              <SkeletonEpisodeList rows={5} />
              <SkeletonEpisodeList rows={3} />
            </div>
          )
        ) : libraryQuery.isError ? (
          <ErrorState onRetry={() => libraryQuery.refetch()} />
        ) : items.length === 0 ? (
          <div className="list-inset mt-4 flex flex-col items-center gap-4 border border-white/5 bg-[#101010] py-24 text-center">
            <h1 className="font-display italic text-snow text-4xl tracking-tight">
              {t("library.empty.title")}
            </h1>
            <p className="font-mono text-xs text-muted/70">{t("library.empty.hint")}</p>
          </div>
        ) : (isGrid ? !hasVisibleGridItems : !hasVisibleListItems) ? (
          <div className="list-inset mt-4 flex flex-col items-center gap-4 border border-white/5 bg-[#101010] py-24 text-center">
            <h1 className="font-display italic text-snow text-4xl tracking-tight">
              {t("library.empty.allDoneTitle")}
            </h1>
            <p className="font-mono text-xs text-muted/70">{t("library.empty.allDoneHint")}</p>
            {sessionQuery.data && (
              <Link
                to="/user/$handle/all-series"
                params={{ handle: selfHandleParam(sessionQuery.data) }}
                viewTransition={pageViewTransition}
                className="font-mono text-[10px] tracking-widest uppercase bg-yellow text-[#080808] px-4 py-2 mt-4 transition-opacity hover:opacity-90"
              >
                {t("profile.allSeries")}
              </Link>
            )}
          </div>
        ) : (
          <>
            {sectionsToRender.map((c) =>
              isGrid ? (
                <CategorySection
                  key={c}
                  category={c}
                  items={byCategory.get(c) ?? []}
                  sort={sectionSort(sectionSorts, c)}
                  collapsed={collapsedSections.includes(c)}
                  onToggleCollapse={() => toggleSection(c)}
                />
              ) : (
                <CategoryListSection
                  key={c}
                  category={c}
                  items={byCategory.get(c) ?? []}
                  sort={sectionSort(sectionSorts, c)}
                  collapsed={collapsedSections.includes(c)}
                  onToggleCollapse={() => toggleSection(c)}
                  {...(c === anchorCategory ? { headingRef: nextHeadingRef } : {})}
                  isMarking={isMarking}
                  onQuickMark={(episodeId, itemId) => quickMark.mutate({ episodeId, itemId })}
                />
              ),
            )}
            <AddSectionBar
              sections={sections}
              sectionSorts={sectionSorts}
              onSectionsChange={updateSections}
              onSortChange={setSortFor}
            />
          </>
        )}
      </section>
    </PullToRefresh>
  );
}
