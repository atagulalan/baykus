import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ApiError,
  addEpisodeWatch,
  addSeries,
  bulkWatch,
  getSeriesByParam,
  getSeriesPreview,
} from "../api/client.ts";
import { buildImageUrl } from "../api/images.ts";
import type { EpisodeSummary, ExternalIds } from "../api/types.ts";
import { SeasonSection } from "../components/SeasonSection.tsx";
import { todayIso } from "../lib/date.ts";
import { genreKey } from "../lib/genreKey.ts";
import { sortSeasonsSpecialsLast } from "../lib/seasons.ts";
import { useToast } from "../lib/toast.tsx";

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
  const today = todayIso();
  for (const season of sortSeasonsSpecialsLast(seasons)) {
    for (const ep of season.episodes) {
      if (ep.airDate !== null && ep.airDate <= today) return { s: ep.s, e: ep.e };
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
 * E131: not-in-library series page from search. Shows full provider inventory;
 * marking an episode (or İzlemeye başla) adds the show and starts watching.
 */
export function SeriesPreviewPage() {
  const search = useSearch({ from: "/series/new" });
  const externalIds = idsFromSearch(search);
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["series-preview", search],
    queryFn: () => getSeriesPreview(externalIds as ExternalIds),
    enabled: externalIds != null,
  });

  useEffect(() => {
    if (query.data?.libraryItemId != null) {
      navigate({
        to: "/series/$id",
        params: { id: `i${query.data.libraryItemId}` },
        replace: true,
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
      navigate({ to: "/series/$id", params: { id: `i${result.itemId}` }, replace: true });
    },
    onError: () => {
      toast.show(t("search.addError"), "error");
    },
  });

  if (externalIds == null) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-muted">{t("series.previewMissingIds")}</p>
        <Link to="/search" className="text-sm text-muted underline">
          {t("app.nav.search")}
        </Link>
      </div>
    );
  }

  if (query.isLoading) {
    return <div className="h-64 animate-pulse bg-white/5" />;
  }

  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-muted">{t("errors.generic")}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="border border-white/10 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-snow px-3 py-1.5 transition-colors"
        >
          {t("errors.retry")}
        </button>
        <Link to="/search" className="text-sm text-muted underline">
          {t("app.nav.search")}
        </Link>
      </div>
    );
  }

  const preview = query.data;
  if (!preview || preview.libraryItemId != null) return null;

  const { seasons } = preview;
  const imageUrl = buildImageUrl(preview.posterRef);
  const transitionName = `poster-preview-${preview.externalIds.tmdbId ?? preview.externalIds.tvmazeId ?? preview.externalIds.tvdbId ?? preview.title}`;
  const sortedSeasons = sortSeasonsSpecialsLast(seasons);
  const nextUnwatched = previewNextUnwatched(seasons);
  const pending = startMutation.isPending;

  function episodeBySyntheticId(id: number): EpisodeSummary | undefined {
    for (const season of seasons) {
      const ep = season.episodes.find((e) => e.id === id);
      if (ep) return ep;
    }
    return undefined;
  }

  return (
    <div className={`flex flex-col gap-6 ${pending ? "pointer-events-none opacity-60" : ""}`}>
      <div className="flex flex-col gap-4 sm:flex-row">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={preview.title}
            className="w-40 h-auto shrink-0 bg-white/5"
            style={{ viewTransitionName: transitionName }}
          />
        ) : (
          <div
            className="flex aspect-[2/3] w-40 shrink-0 items-center justify-center overflow-hidden bg-white/5 p-2 text-center text-sm text-muted"
            style={{ viewTransitionName: transitionName }}
          >
            {preview.title}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-3">
          <h1 className="font-display italic text-snow text-4xl leading-none tracking-tight">
            {preview.title}
            {preview.year ? (
              <span className="font-sans not-italic text-2xl text-muted ml-2">
                ({preview.year})
              </span>
            ) : null}
          </h1>

          {preview.tagline && <p className="text-sm text-muted italic">"{preview.tagline}"</p>}

          {(preview.network || preview.releaseStatus) && (
            <p className="font-mono text-[10px] tracking-wide text-muted">
              {[preview.network, preview.releaseStatus].filter(Boolean).join(" · ")}
            </p>
          )}

          {preview.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {preview.genres.map((g) => (
                <span key={g.id ?? g.name} className="bg-white/5 px-2 py-0.5 text-xs text-muted">
                  {t(`genres.${genreKey(g.name)}`, { defaultValue: g.name })}
                </span>
              ))}
            </div>
          )}

          {preview.overview && (
            <p className="max-w-prose text-sm leading-relaxed text-snow/80">{preview.overview}</p>
          )}

          <div className="mt-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => startMutation.mutate({ kind: "add" })}
              className="bg-yellow px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#080808] hover:opacity-90 disabled:opacity-50"
            >
              {pending ? t("search.loading") : t("series.startWatching")}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        {sortedSeasons.map((season) => (
          <SeasonSection
            key={season.number}
            season={season}
            nextUnwatched={nextUnwatched}
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
        ))}
      </div>
    </div>
  );
}
