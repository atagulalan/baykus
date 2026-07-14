import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ApiError,
  addEpisodeWatch,
  bulkWatch,
  clearRating,
  getSeries,
  getSettings,
  refreshSeries,
  removeLatestEpisodeWatch,
  setRating,
  updateSeries,
} from "../api/client.ts";
import { buildImageUrl } from "../api/images.ts";
import type {
  AddWatchResult,
  BulkWatchResult,
  EpisodeSummary,
  SeriesDetail,
  SeriesSummary,
  TrackingStatus,
} from "../api/types.ts";
import { RatingControl } from "../components/RatingControl.tsx";
import { SeasonSection } from "../components/SeasonSection.tsx";
import { WatchDateDialog } from "../components/WatchDateDialog.tsx";
import { useToast } from "../lib/toast.tsx";

const RATING_PROMPT_TIMEOUT_MS = 5000;

const STATUSES: TrackingStatus[] = ["watching", "plan_to_watch", "completed", "dropped", "paused"];

/** Falls back to plain text if the logo 404s (e.g. its provider isn't registered right now). */
function LogoOrText({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span>{alt}</span>;
  return <img src={src} alt={alt} className="h-4 object-contain" onError={() => setFailed(true)} />;
}

/** Decorative icon that just disappears on a 404 instead of showing a broken-image glyph. */
function DecorativeLogo({ src, className }: { src: string | null; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return <img src={src} alt="" className={className} onError={() => setFailed(true)} />;
}

function updateEpisodeInDetail(
  detail: SeriesDetail,
  episodeId: number,
  updater: (ep: EpisodeSummary) => EpisodeSummary,
): SeriesDetail {
  let watchedDelta = 0;
  const seasons = detail.seasons.map((season) => ({
    ...season,
    episodes: season.episodes.map((ep) => {
      if (ep.id !== episodeId) return ep;
      const wasWatched = ep.watchCount > 0;
      const next = updater(ep);
      const isWatched = next.watchCount > 0;
      if (wasWatched !== isWatched) watchedDelta = isWatched ? 1 : -1;
      return next;
    }),
  }));
  return {
    ...detail,
    seasons,
    progress: { ...detail.progress, watched: detail.progress.watched + watchedDelta },
  };
}

export function SeriesDetailPage() {
  const { id: idParam } = useParams({ from: "/series/$id" });
  const id = Number(idParam);
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["series", id] as const;

  const [dateDialogEpisode, setDateDialogEpisode] = useState<EpisodeSummary | null>(null);
  const [showCompletePrompt, setShowCompletePrompt] = useState(false);
  const [promptEpisodeId, setPromptEpisodeId] = useState<number | null>(null);

  const query = useQuery({ queryKey, queryFn: () => getSeries(id) });
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const activeRegion = settingsQuery.data?.region ?? "TR";

  useEffect(() => {
    if (promptEpisodeId === null) return;
    const timer = setTimeout(() => setPromptEpisodeId(null), RATING_PROMPT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [promptEpisodeId]);

  function handleWatchResult(result: AddWatchResult | BulkWatchResult) {
    if (result.suggestCompleted && query.data?.status !== "completed") {
      setShowCompletePrompt(true);
    }
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["library"] });
  }

  function reportError() {
    toast.show(t("errors.generic"), "error");
  }

  const toggleWatch = useMutation<
    AddWatchResult | null,
    unknown,
    EpisodeSummary,
    { previous: SeriesDetail | undefined }
  >({
    mutationFn: async (episode) => {
      if (episode.watchCount > 0) {
        await removeLatestEpisodeWatch(episode.id);
        return null;
      }
      return addEpisodeWatch(episode.id);
    },
    onMutate: async (episode) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SeriesDetail>(queryKey);
      const willWatch = episode.watchCount === 0;
      queryClient.setQueryData<SeriesDetail>(
        queryKey,
        (old) =>
          old &&
          updateEpisodeInDetail(old, episode.id, (ep) => ({
            ...ep,
            watchCount: willWatch ? ep.watchCount + 1 : Math.max(0, ep.watchCount - 1),
            lastWatchedAt: willWatch ? new Date().toISOString() : null,
          })),
      );
      return { previous };
    },
    onError: (_err, _episode, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      reportError();
    },
    onSuccess: (result, episode) => {
      if (result) {
        handleWatchResult(result);
        setPromptEpisodeId(episode.id);
      }
    },
    onSettled: invalidate,
  });

  const watchAgain = useMutation({
    mutationFn: (episodeId: number) => addEpisodeWatch(episodeId),
    onError: reportError,
    onSuccess: (result, episodeId) => {
      handleWatchResult(result);
      setPromptEpisodeId(episodeId);
    },
    onSettled: invalidate,
  });

  const editDate = useMutation({
    mutationFn: async ({ episode, iso }: { episode: EpisodeSummary; iso: string }) => {
      if (episode.watchCount > 0) await removeLatestEpisodeWatch(episode.id);
      return addEpisodeWatch(episode.id, iso);
    },
    onError: reportError,
    onSuccess: (result) => handleWatchResult(result),
    onSettled: invalidate,
  });

  const bulkUpToHere = useMutation({
    mutationFn: (episodeId: number) => bulkWatch(id, { upToEpisodeId: episodeId }),
    onError: reportError,
    onSuccess: (result) => handleWatchResult(result),
    onSettled: invalidate,
  });

  const markSeasonWatched = useMutation({
    mutationFn: (seasonNumber: number) => bulkWatch(id, { seasonNumber }),
    onError: reportError,
    onSuccess: (result) => handleWatchResult(result),
    onSettled: invalidate,
  });

  const changeStatus = useMutation<
    SeriesSummary,
    unknown,
    TrackingStatus,
    { previous: SeriesDetail | undefined }
  >({
    mutationFn: (status: TrackingStatus) => updateSeries(id, { status }),
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SeriesDetail>(queryKey);
      queryClient.setQueryData<SeriesDetail>(queryKey, (old) => old && { ...old, status });
      return { previous };
    },
    onError: (_err, _status, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      reportError();
    },
    onSettled: invalidate,
  });

  const refreshSeriesMutation = useMutation({
    mutationFn: () => refreshSeries(id),
    onSuccess: (result) => {
      toast.show(
        result.newEpisodes > 0
          ? t("series.refreshFoundNew", { count: result.newEpisodes })
          : t("series.refreshUpToDate"),
      );
    },
    onError: reportError,
    onSettled: invalidate,
  });

  const toggleMute = useMutation<
    SeriesSummary,
    unknown,
    boolean,
    { previous: SeriesDetail | undefined }
  >({
    mutationFn: (pushMuted: boolean) => updateSeries(id, { pushMuted }),
    onMutate: async (pushMuted) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SeriesDetail>(queryKey);
      queryClient.setQueryData<SeriesDetail>(queryKey, (old) => old && { ...old, pushMuted });
      return { previous };
    },
    onError: (_err, _pushMuted, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      reportError();
    },
    onSettled: invalidate,
  });

  const rateItem = useMutation<
    unknown,
    unknown,
    1 | 2 | 3 | null,
    { previous: SeriesDetail | undefined }
  >({
    mutationFn: (value) =>
      value === null ? clearRating("item", id) : setRating("item", id, value),
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SeriesDetail>(queryKey);
      queryClient.setQueryData<SeriesDetail>(queryKey, (old) => old && { ...old, rating: value });
      return { previous };
    },
    onError: (_err, _value, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      reportError();
    },
    onSettled: invalidate,
  });

  const rateEpisode = useMutation({
    mutationFn: ({ episodeId, value }: { episodeId: number; value: 1 | 2 | 3 }) =>
      setRating("episode", episodeId, value),
    onError: reportError,
    onSuccess: () => setPromptEpisodeId(null),
    onSettled: invalidate,
  });

  if (query.isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-zinc-900" />;
  }

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.code === "NOT_FOUND";
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-zinc-400">{notFound ? t("series.notFound") : t("errors.generic")}</p>
        {!notFound && (
          <button
            type="button"
            onClick={() => query.refetch()}
            className="rounded bg-zinc-800 px-3 py-1.5 text-sm"
          >
            {t("errors.retry")}
          </button>
        )}
        <Link to="/" className="text-sm text-zinc-400 underline">
          {t("app.nav.library")}
        </Link>
      </div>
    );
  }

  const detail = query.data;
  if (!detail) return null;

  const imageUrl = buildImageUrl(detail.posterRef, "large");
  const { watched, aired } = detail.progress;
  const percent = aired > 0 ? Math.round((watched / aired) * 100) : 0;
  const contentRating =
    detail.contentRatings.find((r) => r.region === activeRegion) ?? detail.contentRatings[0];
  const regionWatchProviders = detail.watchProviders.filter((wp) => wp.region === activeRegion);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
          {imageUrl ? (
            <img src={imageUrl} alt={detail.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-2 text-center text-sm text-zinc-400">
              {detail.title}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold text-2xl">
              {detail.title}
              {detail.year ? ` (${detail.year})` : ""}
            </h1>
            <select
              value={detail.status}
              onChange={(e) => changeStatus.mutate(e.target.value as TrackingStatus)}
              aria-label={t("status.label")}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => refreshSeriesMutation.mutate()}
              disabled={refreshSeriesMutation.isPending}
              aria-label={t("series.refresh")}
              className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
            >
              {refreshSeriesMutation.isPending ? "…" : "⟳"}
            </button>
            <button
              type="button"
              onClick={() => toggleMute.mutate(!detail.pushMuted)}
              aria-label={detail.pushMuted ? t("series.unmute") : t("series.mute")}
              className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              {detail.pushMuted ? "🔕" : "🔔"}
            </button>
          </div>
          {detail.tagline && <p className="text-sm text-zinc-400 italic">"{detail.tagline}"</p>}

          {(detail.networks.length > 0 || contentRating) && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
              {detail.networks.map((n) => (
                <LogoOrText key={n.name} src={buildImageUrl(n.logoRef, "thumb")} alt={n.name} />
              ))}
              {contentRating && (
                <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-xs">
                  {contentRating.rating}
                </span>
              )}
            </div>
          )}

          {detail.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {detail.genres.map((g) => (
                <span
                  key={g.id ?? g.name}
                  className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {detail.externalRatings.length > 0 && (
            <p className="text-sm text-zinc-400">
              {detail.externalRatings.map((r, i) => (
                <span key={r.source}>
                  {i > 0 && " · "}⭐ {r.source.toUpperCase()}{" "}
                  {(r.scale === 10 ? r.value : (r.value / r.scale) * 10).toFixed(1)}
                </span>
              ))}
            </p>
          )}

          <RatingControl
            value={detail.rating}
            onChange={(value) => rateItem.mutate(value)}
            size="sm"
          />

          {regionWatchProviders.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                {regionWatchProviders.map((wp) => {
                  return (
                    <span
                      key={`${wp.provider}-${wp.type}-${wp.region}`}
                      className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
                    >
                      <DecorativeLogo
                        src={buildImageUrl(wp.logoRef, "thumb")}
                        className="h-4 w-4 rounded object-cover"
                      />
                      {wp.provider} ({wp.region})
                    </span>
                  );
                })}
              </div>
              <p className="text-xs text-zinc-500">{t("series.justwatchAttribution")}</p>
            </div>
          )}

          <div className="mt-2 flex flex-col gap-1">
            <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-sm text-zinc-400">
              {watched}/{aired}
              {detail.nextUnwatched && (
                <>
                  {" · "}
                  {t("series.nextUp", { s: detail.nextUnwatched.s, e: detail.nextUnwatched.e })}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        {detail.seasons.map((season) => (
          <SeasonSection
            key={season.number}
            season={season}
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
            promptEpisodeId={promptEpisodeId}
            onRateEpisode={(episodeId, value) => rateEpisode.mutate({ episodeId, value })}
            onDismissPrompt={() => setPromptEpisodeId(null)}
          />
        ))}
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

      {showCompletePrompt && (
        <div className="-translate-x-1/2 fixed bottom-20 left-1/2 z-40 flex items-center gap-3 rounded-lg bg-zinc-800 px-4 py-2 text-sm shadow-lg">
          <span>{t("series.suggestCompleted")}</span>
          <button
            type="button"
            onClick={() => {
              changeStatus.mutate("completed");
              setShowCompletePrompt(false);
            }}
            className="rounded bg-emerald-600 px-2 py-1 font-medium text-white text-xs"
          >
            {t("series.moveToCompleted")}
          </button>
          <button
            type="button"
            onClick={() => setShowCompletePrompt(false)}
            className="text-xs text-zinc-400 hover:text-zinc-100"
          >
            {t("series.staySame")}
          </button>
        </div>
      )}
    </div>
  );
}
