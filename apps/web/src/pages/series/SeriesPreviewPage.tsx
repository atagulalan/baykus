import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ApiError,
  addEpisodeWatch,
  addSeries,
  bulkWatch,
  getSeriesByParam,
  getSeriesPreview,
  getSettings,
} from "../../api/client.ts";
import type { EpisodeSummary, ExternalIds } from "../../api/types.ts";
import { SkeletonSeriesDetailHero } from "../../components/atoms/Skeleton/Skeleton.tsx";
import { CollapsedSeasonsGap } from "../../components/molecules/CollapsedSeasonsGap/CollapsedSeasonsGap.tsx";
import { SeasonSection } from "../../components/organisms/SeasonSection/SeasonSection.tsx";
import { isEpisodeAired } from "../../lib/airing.ts";
import { pageViewTransition } from "../../lib/pageViewTransition.ts";
import {
  collapseCompletedSeasonRuns,
  isSeasonComplete,
  sortSeasonsSpecialsLast,
} from "../../lib/seasons.ts";
import { seriesPreviewAsDetail } from "../../lib/seriesPreviewAsDetail.ts";
import { useToast } from "../../lib/toast.tsx";
import { useSeasonAccordionAdvance } from "../../lib/useSeasonAccordionAdvance.ts";
import { SeriesDetailHero } from "./components/SeriesDetailHero/SeriesDetailHero.tsx";

function idsFromSearch(search: {
  tmdbId?: number | undefined;
  tvmazeId?: number | undefined;
  imdbId?: string | undefined;
  tvdbId?: number | undefined;
}): ExternalIds | null {
  const ids: ExternalIds = {};
  if (search.tmdbId != null) ids.tmdbId = search.tmdbId;
  if (search.tvmazeId != null) ids.tvmazeId = search.tvmazeId;
  if (search.imdbId) ids.imdbId = search.imdbId;
  if (search.tvdbId != null) ids.tvdbId = search.tvdbId;
  return Object.keys(ids).length > 0 ? ids : null;
}

function findEpisodeBySlot(
  detail: { seasons: { number: number; episodes: EpisodeSummary[] }[] },
  s: number,
  e: number,
): EpisodeSummary | undefined {
  for (const season of detail.seasons) {
    if (season.number !== s) continue;
    return season.episodes.find((ep) => ep.e === e);
  }
  return undefined;
}

function previewNextUnwatched(
  seasons: { number: number; episodes: EpisodeSummary[] }[],
): { s: number; e: number } | null {
  for (const season of sortSeasonsSpecialsLast(seasons)) {
    for (const ep of season.episodes) {
      if (isEpisodeAired(ep)) return { s: ep.s, e: ep.e };
    }
  }
  return null;
}

type StartAction =
  | { kind: "add" }
  | { kind: "watch"; s: number; e: number }
  | { kind: "bulkUpTo"; s: number; e: number }
  | { kind: "season"; seasonNumber: number };

/**
 * E131: not-in-library series page from search. Shares SeriesDetailHero /
 * season list with the library detail page; marking an episode (or
 * İzlemeye başla) adds the show and starts watching.
 */
export function SeriesPreviewPage() {
  const search = useSearch({ from: "/series/new" });
  const externalIds = idsFromSearch(search);
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expandedSeasonGaps, setExpandedSeasonGaps] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const previewGapKey = JSON.stringify(search);
  const [gapsForPreview, setGapsForPreview] = useState(previewGapKey);
  if (gapsForPreview !== previewGapKey) {
    setGapsForPreview(previewGapKey);
    setExpandedSeasonGaps(new Set());
  }

  const query = useQuery({
    queryKey: ["series-preview", search],
    queryFn: () => getSeriesPreview(externalIds as ExternalIds),
    enabled: externalIds != null,
  });
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
  const activeRegion = settingsQuery.data?.region ?? "TR";
  const preview = query.data;

  const previewIdentity = preview
    ? String(
        preview.externalIds.tmdbId ??
          preview.externalIds.tvmazeId ??
          preview.externalIds.tvdbId ??
          preview.title,
      )
    : null;

  const { expandedSeasonNumber, onToggleExpanded, onSeasonCloseComplete, onSeasonOpenComplete } =
    useSeasonAccordionAdvance({
      seasons: preview?.seasons,
      identity: previewIdentity,
      nextUnwatched: preview ? previewNextUnwatched(preview.seasons) : null,
      enabled: preview != null && preview.libraryItemId == null,
    });

  useEffect(() => {
    if (query.data?.libraryItemId != null) {
      navigate({
        to: "/series/$id",
        params: { id: `i${query.data.libraryItemId}` },
        replace: true,
        viewTransition: pageViewTransition,
      });
    }
  }, [query.data?.libraryItemId, navigate]);

  const startMutation = useMutation({
    mutationFn: async (action: StartAction) => {
      let itemId: number;
      let added = false;
      let title: string | undefined;

      try {
        const summary = await addSeries(externalIds as ExternalIds);
        itemId = summary.id;
        added = true;
        title = summary.title;
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.code === "CONFLICT" &&
          error.details &&
          typeof error.details === "object" &&
          "itemId" in error.details
        ) {
          itemId = (error.details as { itemId: number }).itemId;
        } else {
          throw error;
        }
      }

      if (action.kind !== "add") {
        const detail = await getSeriesByParam(`i${itemId}`);
        if (action.kind === "watch") {
          const episode = findEpisodeBySlot(detail, action.s, action.e);
          if (!episode) throw new Error(`episode S${action.s}E${action.e} missing after add`);
          await addEpisodeWatch(episode.id);
        } else if (action.kind === "bulkUpTo") {
          const episode = findEpisodeBySlot(detail, action.s, action.e);
          if (!episode) throw new Error(`episode S${action.s}E${action.e} missing after add`);
          await bulkWatch(itemId, { upToEpisodeId: episode.id });
        } else {
          await bulkWatch(itemId, { seasonNumber: action.seasonNumber });
        }
      }

      return { itemId, added, title };
    },
    onSuccess: (result) => {
      if (result.added && result.title) {
        toast.show(t("search.added", { title: result.title }));
      }
      queryClient.invalidateQueries({ queryKey: ["library"] });
      navigate({
        to: "/series/$id",
        params: { id: `i${result.itemId}` },
        replace: true,
        viewTransition: pageViewTransition,
      });
    },
    onError: () => {
      toast.show(t("search.addError"), "error");
    },
  });

  if (externalIds == null) {
    return (
      <div className="page-top content-inset flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-muted">{t("series.previewMissingIds")}</p>
        <Link
          to="/search"
          viewTransition={pageViewTransition}
          className="text-sm text-muted underline"
        >
          {t("app.nav.search")}
        </Link>
      </div>
    );
  }

  if (query.isLoading) {
    return <SkeletonSeriesDetailHero />;
  }

  if (query.isError) {
    return (
      <div className="page-top content-inset flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-muted">{t("errors.generic")}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-snow"
        >
          {t("errors.retry")}
        </button>
        <Link
          to="/search"
          viewTransition={pageViewTransition}
          className="text-sm text-muted underline"
        >
          {t("app.nav.search")}
        </Link>
      </div>
    );
  }

  if (!preview || preview.libraryItemId != null) return null;

  const loadedPreview = preview;
  const detail = seriesPreviewAsDetail(loadedPreview);
  const sortedSeasons = sortSeasonsSpecialsLast(loadedPreview.seasons);
  const seasonEntries = collapseCompletedSeasonRuns(
    sortedSeasons,
    isSeasonComplete,
    expandedSeasonGaps,
  );
  const nextUnwatched = previewNextUnwatched(loadedPreview.seasons);
  const pending = startMutation.isPending;
  const transitionName = `poster-preview-${loadedPreview.externalIds.tmdbId ?? loadedPreview.externalIds.tvmazeId ?? loadedPreview.externalIds.tvdbId ?? loadedPreview.title}`;

  function episodeBySyntheticId(id: number): EpisodeSummary | undefined {
    for (const season of loadedPreview.seasons) {
      const ep = season.episodes.find((e) => e.id === id);
      if (ep) return ep;
    }
    return undefined;
  }

  return (
    <div className={`flex flex-col gap-6 ${pending ? "pointer-events-none opacity-60" : ""}`}>
      <SeriesDetailHero
        detail={detail}
        activeRegion={activeRegion}
        detailsOpen={detailsOpen}
        onDetailsOpenChange={setDetailsOpen}
        onRateChange={() => {}}
        onToggleFavorite={() => {}}
        onChangeManualList={() => {}}
        onToggleMute={() => {}}
        onRemove={() => {}}
        preview
        posterStyle={{ viewTransitionName: transitionName }}
        onStartWatching={() => startMutation.mutate({ kind: "add" })}
        startWatchingPending={pending}
      />

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
              nextUnwatched={nextUnwatched}
              expanded={expandedSeasonNumber === season.number}
              onToggleExpanded={() => onToggleExpanded(season.number)}
              onCloseComplete={() => onSeasonCloseComplete(season.number)}
              onOpenComplete={() => onSeasonOpenComplete(season.number)}
              onToggleWatch={(episodeId) => {
                const ep = episodeBySyntheticId(episodeId);
                if (ep) startMutation.mutate({ kind: "watch", s: ep.s, e: ep.e });
              }}
              onWatchAgain={() => {}}
              onEditDate={() => {}}
              onBulkUpToHere={(episodeId) => {
                const ep = episodeBySyntheticId(episodeId);
                if (ep) startMutation.mutate({ kind: "bulkUpTo", s: ep.s, e: ep.e });
              }}
              onMarkSeasonWatched={() =>
                startMutation.mutate({ kind: "season", seasonNumber: season.number })
              }
              onUnwatchSeason={() => {}}
              promptEpisodeId={null}
              onRateEpisode={() => {}}
              onDismissPrompt={() => {}}
            />
          );
        })}
      </div>
    </div>
  );
}
