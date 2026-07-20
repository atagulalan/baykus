import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ApiError, getSeriesByParam, getSettings, refreshSeries } from "../../api/client.ts";
import type { EpisodeSummary, SeriesDetail, SeriesListResponse } from "../../api/types.ts";
import { SkeletonSeriesDetailHero } from "../../components/atoms/Skeleton/Skeleton.tsx";
import { RemoveSeriesDialog } from "../../components/dialogs/RemoveSeriesDialog/RemoveSeriesDialog.tsx";
import { WatchDateDialog } from "../../components/dialogs/WatchDateDialog/WatchDateDialog.tsx";
import { CollapsedSeasonsGap } from "../../components/molecules/CollapsedSeasonsGap/CollapsedSeasonsGap.tsx";
import { NextUpCard } from "../../components/molecules/NextUpCard/NextUpCard.tsx";
import { PullToRefresh } from "../../components/molecules/PullToRefresh/PullToRefresh.tsx";
import { SeasonSection } from "../../components/organisms/SeasonSection/SeasonSection.tsx";
import { SeriesActionsMenu } from "../../components/organisms/SeriesActionsMenu/SeriesActionsMenu.tsx";
import { SERIES_HEADER_ACTION_SLOT_ID } from "../../lib/headerActionSlot.ts";
import { pageViewTransition } from "../../lib/pageViewTransition.ts";
import { getLastPosterItemId, posterMorphStyle } from "../../lib/posterTransition.ts";
import {
  collapseCompletedSeasonRuns,
  isSeasonComplete,
  sortSeasonsSpecialsLast,
} from "../../lib/seasons.ts";
import { parseSeriesParam, seriesParam } from "../../lib/seriesPath.ts";
import { isStale } from "../../lib/staleSweep.ts";
import { readUiPrefs } from "../../lib/uiPrefs.ts";
import { useSeasonAccordionAdvance } from "../../lib/useSeasonAccordionAdvance.ts";
import { NeedsReviewBanner } from "./components/NeedsReviewBanner/NeedsReviewBanner.tsx";
import { SeriesDetailHero } from "./components/SeriesDetailHero/SeriesDetailHero.tsx";
import { useSeriesDetailMutations } from "./useSeriesDetailMutations.ts";

/** E51: resolve internal item id so the loading shell can own `poster-${id}` during VT. */
function posterTransitionItemId(
  param: string,
  queryClient: ReturnType<typeof useQueryClient>,
): number | null {
  const parsed = parseSeriesParam(param);
  if (parsed.kind === "internal") return parsed.id;
  if (parsed.kind !== "tmdb") return null;

  const cached = queryClient.getQueryData<SeriesDetail>(["series", param]);
  if (cached?.id) return cached.id;

  for (const key of [["library", "browse"], ["library"]] as const) {
    const list = queryClient.getQueryData<SeriesListResponse>([...key]);
    const hit = list?.items.find((item) => item.tmdbId === parsed.id);
    if (hit) return hit.id;
  }
  return null;
}

export function SeriesDetailPage() {
  const { id: param } = useParams({ from: "/series/$id" });
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = ["series", param] as const;

  const [dateDialogEpisode, setDateDialogEpisode] = useState<EpisodeSummary | null>(null);
  const [promptEpisodeId, setPromptEpisodeId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [headerActionSlot, setHeaderActionSlot] = useState<HTMLElement | null>(null);
  const [expandedSeasonGaps, setExpandedSeasonGaps] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [gapsForParam, setGapsForParam] = useState(param);
  if (gapsForParam !== param) {
    setGapsForParam(param);
    setExpandedSeasonGaps(new Set());
  }

  const navigate = useNavigate();

  useLayoutEffect(() => {
    setHeaderActionSlot(document.getElementById(SERIES_HEADER_ACTION_SLOT_ID));
  }, []);

  const query = useQuery({ queryKey, queryFn: () => getSeriesByParam(param) });
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
  const activeRegion = settingsQuery.data?.region ?? "TR";

  const {
    toggleWatch,
    watchAgain,
    editDate,
    bulkUpToHere,
    markSeasonWatched,
    unwatchSeason,
    changeNeedsReview,
    fillMissingSeasons,
    changeManualList,
    refreshSeriesMutation,
    toggleMute,
    toggleFavorite,
    removeMutation,
    rateItem,
    rateEpisode,
  } = useSeriesDetailMutations({
    param,
    detail: query.data,
    onPromptEpisodeRating: setPromptEpisodeId,
  });

  useEffect(() => {
    if (!query.data) return;
    const canonical = seriesParam(query.data);
    if (canonical !== param) {
      // Don't start a second view transition — it cancels the poster morph from the list.
      navigate({
        to: "/series/$id",
        params: { id: canonical },
        replace: true,
        viewTransition: false,
      });
    }
  }, [query.data, param, navigate]);

  const staleAutoRefreshFired = useRef(false);
  useEffect(() => {
    if (!query.data) return;
    if (staleAutoRefreshFired.current) return;
    if (!isStale(query.data.lastRefreshedAt)) return;
    staleAutoRefreshFired.current = true;
    refreshSeries(query.data.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: ["library"] });
      })
      .catch(() => {});
  }, [query.data, queryClient, queryKey]);

  const { expandedSeasonNumber, onToggleExpanded, onSeasonCloseComplete, onSeasonOpenComplete } =
    useSeasonAccordionAdvance({
      seasons: query.data?.seasons,
      identity: query.data?.id,
      nextUnwatched: query.data?.nextUnwatched ?? null,
    });

  function handleRemove() {
    if (query.data) {
      setShowRemoveDialog(true);
    }
  }

  if (query.isLoading) {
    const posterId = posterTransitionItemId(param, queryClient);
    const posterActive = posterId != null && posterId === getLastPosterItemId();
    return (
      <SkeletonSeriesDetailHero
        posterStyle={posterId != null ? posterMorphStyle(posterId, posterActive) : undefined}
      />
    );
  }

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.code === "NOT_FOUND";
    return (
      <div className="page-top content-inset flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-muted">{notFound ? t("series.notFound") : t("errors.generic")}</p>
        {!notFound && (
          <button
            type="button"
            onClick={() => query.refetch()}
            className="border border-white/10 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-snow px-3 py-1.5 transition-colors"
          >
            {t("errors.retry")}
          </button>
        )}
        <Link to="/" viewTransition={pageViewTransition} className="text-sm text-muted underline">
          {t("app.nav.library")}
        </Link>
      </div>
    );
  }

  const detail = query.data;
  if (!detail) return null;

  const sortedSeasons = sortSeasonsSpecialsLast(detail.seasons);
  const seasonEntries = collapseCompletedSeasonRuns(
    sortedSeasons,
    isSeasonComplete,
    expandedSeasonGaps,
  );
  const nextUpEpisode =
    detail.nextUnwatched == null
      ? null
      : (detail.seasons
          .flatMap((season) => season.episodes)
          .find((episode) => episode.id === detail.nextUnwatched?.episodeId) ?? null);

  return (
    <PullToRefresh
      onRefresh={async () => {
        await refreshSeriesMutation.mutateAsync();
      }}
    >
      <div className="flex flex-col gap-6">
        <SeriesDetailHero
          detail={detail}
          activeRegion={activeRegion}
          detailsOpen={detailsOpen}
          onDetailsOpenChange={setDetailsOpen}
          onRateChange={(value) => rateItem.mutate(value)}
          onToggleFavorite={() => toggleFavorite.mutate(!detail.favorite)}
          onChangeManualList={(manualList) => changeManualList.mutate(manualList)}
          onToggleMute={() => toggleMute.mutate(!detail.pushMuted)}
          onRemove={handleRemove}
        />

        {headerActionSlot &&
          createPortal(
            <SeriesActionsMenu
              favorite={detail.favorite}
              manualList={detail.manualList}
              category={detail.category}
              pushMuted={detail.pushMuted}
              onToggleFavorite={() => toggleFavorite.mutate(!detail.favorite)}
              onChangeManualList={(manualList) => changeManualList.mutate(manualList)}
              onToggleMute={() => toggleMute.mutate(!detail.pushMuted)}
              onRemove={handleRemove}
              triggerClassName="flex h-11 w-11 shrink-0 items-center justify-center text-muted transition-colors hover:text-snow"
            />,
            headerActionSlot,
          )}

        {detail.needsReview && (
          <NeedsReviewBanner
            isLoading={fillMissingSeasons.isPending || changeNeedsReview.isPending}
            onFill={() => fillMissingSeasons.mutate()}
            onDismiss={() => changeNeedsReview.mutate(false)}
          />
        )}

        {detail.nextUnwatched && nextUpEpisode && readUiPrefs().showNextUpCarousel && (
          <NextUpCard
            key={detail.id}
            episode={nextUpEpisode}
            nextEpisode={detail.nextUnwatched}
            promptEpisodeId={promptEpisodeId}
            onToggleWatch={() => toggleWatch.mutate(nextUpEpisode)}
            onWatchAgain={() => watchAgain.mutate(nextUpEpisode.id)}
            onEditDate={() => setDateDialogEpisode(nextUpEpisode)}
            onBulkUpToHere={() => bulkUpToHere.mutate(nextUpEpisode.id)}
            onRateEpisode={(value) => rateEpisode.mutate({ episodeId: nextUpEpisode.id, value })}
            onDismissPrompt={() => setPromptEpisodeId(null)}
          />
        )}

        <div className="flex flex-col">
          {seasonEntries.map((entry) => {
            if (entry.kind === "gap") {
              return (
                <CollapsedSeasonsGap
                  key={entry.gapKey}
                  count={entry.seasons.length}
                  onExpand={() => setExpandedSeasonGaps((prev) => new Set(prev).add(entry.gapKey))}
                />
              );
            }
            const { season } = entry;
            return (
              <SeasonSection
                key={season.number}
                season={season}
                nextUnwatched={detail.nextUnwatched}
                expanded={expandedSeasonNumber === season.number}
                onToggleExpanded={() => onToggleExpanded(season.number)}
                onCloseComplete={() => onSeasonCloseComplete(season.number)}
                onOpenComplete={() => onSeasonOpenComplete(season.number)}
                onToggleWatch={(episodeId) => {
                  const episode = season.episodes.find((e) => e.id === episodeId);
                  if (episode) toggleWatch.mutate(episode);
                }}
                onWatchAgain={(episodeId) => watchAgain.mutate(episodeId)}
                onEditDate={(episodeId) => {
                  const episode = season.episodes.find((e) => e.id === episodeId);
                  if (episode) setDateDialogEpisode(episode);
                }}
                onBulkUpToHere={(episodeId) => bulkUpToHere.mutate(episodeId)}
                onMarkSeasonWatched={() => markSeasonWatched.mutate(season.number)}
                onUnwatchSeason={() => unwatchSeason.mutate(season.number)}
                promptEpisodeId={promptEpisodeId}
                onRateEpisode={(episodeId, value) => rateEpisode.mutate({ episodeId, value })}
                onDismissPrompt={() => setPromptEpisodeId(null)}
              />
            );
          })}
        </div>

        {dateDialogEpisode && (
          <WatchDateDialog
            initialValue={dateDialogEpisode.lastWatchedAt ?? new Date().toISOString()}
            onClose={() => setDateDialogEpisode(null)}
            onConfirm={(iso) => {
              editDate.mutate({ episode: dateDialogEpisode, iso });
              setDateDialogEpisode(null);
            }}
          />
        )}

        {showRemoveDialog && detail && (
          <RemoveSeriesDialog
            title={detail.title}
            onConfirm={() => removeMutation.mutate()}
            onClose={() => setShowRemoveDialog(false)}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
