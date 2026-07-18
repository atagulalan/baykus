import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Heart, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ApiError,
  addEpisodeWatch,
  bulkUnwatch,
  bulkWatch,
  clearRating,
  getSeriesByParam,
  getSettings,
  refreshSeries,
  removeLatestEpisodeWatch,
  removeSeries,
  setRating,
  updateSeries,
} from "../api/client.ts";
import { buildImageUrl } from "../api/images.ts";
import type {
  AddWatchResult,
  EpisodeSummary,
  ManualList,
  SeriesDetail,
  SeriesSummary,
} from "../api/types.ts";
import { MediaImage } from "../components/MediaImage.tsx";
import { Modal } from "../components/Modal.tsx";
import { NextEpisodeCarousel } from "../components/NextEpisodeCarousel.tsx";
import { RatingControl } from "../components/RatingControl.tsx";
import { RemoveSeriesDialog } from "../components/RemoveSeriesDialog.tsx";
import { SeasonSection } from "../components/SeasonSection.tsx";
import { SegmentedProgress } from "../components/SegmentedProgress.tsx";
import { WatchDateDialog } from "../components/WatchDateDialog.tsx";
import { CATEGORY_TEXT_COLORS } from "../lib/categoryColors.ts";
import { genreKey } from "../lib/genreKey.ts";
import { sortSeasonsSpecialsLast } from "../lib/seasons.ts";
import { seriesParam } from "../lib/seriesPath.ts";
import { isStale } from "../lib/staleSweep.ts";
import { useToast } from "../lib/toast.tsx";
import { readUiPrefs } from "../lib/uiPrefs.ts";

/** Falls back to plain text if the logo 404s (e.g. its provider isn't registered right now). */
function LogoOrText({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span>{alt}</span>;
  return (
    <MediaImage
      src={src}
      alt={alt}
      wrapperClassName="inline-block h-4 min-w-4 align-middle"
      className="h-4 object-contain"
      spinnerSize={10}
      onError={() => setFailed(true)}
    />
  );
}

/** Decorative icon that just disappears on a 404 instead of showing a broken-image glyph. */
function DecorativeLogo({ src, className }: { src: string | null; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <MediaImage
      src={src}
      alt=""
      wrapperClassName="inline-block"
      className={className}
      spinnerSize={10}
      onError={() => setFailed(true)}
    />
  );
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
    progress: {
      ...detail.progress,
      watched: detail.progress.watched + watchedDelta,
    },
  };
}

function NeedsReviewBanner({
  onFill,
  onDismiss,
  isLoading,
}: {
  onFill: () => void;
  onDismiss: () => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 bg-[#1a1a00] border border-yellow/20 p-4">
      <div className="flex items-center gap-2 text-yellow font-display italic text-lg">
        <TriangleAlert size={18} />
        {t("series.needsReviewTitle")}
      </div>
      <p className="text-sm text-snow/80">{t("series.needsReviewDesc")}</p>
      <div className="flex items-center gap-3 mt-1">
        <button
          type="button"
          onClick={onFill}
          disabled={isLoading}
          className="bg-yellow px-4 py-2 font-mono text-[10px] text-[#080808] uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
        >
          {t("series.needsReviewFill")}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={isLoading}
          className="bg-white/5 px-4 py-2 font-mono text-[10px] text-snow uppercase tracking-widest hover:bg-white/10 disabled:opacity-50"
        >
          {t("series.needsReviewDismiss")}
        </button>
      </div>
    </div>
  );
}

export function SeriesDetailPage() {
  const { id: param } = useParams({ from: "/series/$id" });
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["series", param] as const;

  const [dateDialogEpisode, setDateDialogEpisode] = useState<EpisodeSummary | null>(null);
  const [promptEpisodeId, setPromptEpisodeId] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const navigate = useNavigate();

  const query = useQuery({ queryKey, queryFn: () => getSeriesByParam(param) });
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
  const activeRegion = settingsQuery.data?.region ?? "TR";

  /** Mutations always act on the internal id, never the URL param (which may be a tmdbId). */
  function requireInternalId(): number {
    const value = query.data?.id;
    if (value === undefined) throw new Error("mutation fired before series detail loaded");
    return value;
  }

  // E52: canonicalize the URL (replace, no history entry) once the item's real
  // identity is known — guarded by param inequality so it never loops.
  useEffect(() => {
    if (!query.data) return;
    const canonical = seriesParam(query.data);
    if (canonical !== param) {
      navigate({ to: "/series/$id", params: { id: canonical }, replace: true });
    }
  }, [query.data, param, navigate]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["library"] });
  }

  // E65: opening a stale detail refreshes it once, silently — no toast, no spinner
  // beyond the data updating in place; never retried within the same mount.
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
      .catch(() => {
        // silent — E65; lastRefreshedAt stays stale so the next mount retries.
      });
  }, [query.data, queryClient, queryKey]);

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
      if (result) setPromptEpisodeId(episode.id);
    },
    onSettled: invalidate,
  });

  const watchAgain = useMutation({
    mutationFn: (episodeId: number) => addEpisodeWatch(episodeId),
    onError: reportError,
    onSuccess: (_result, episodeId) => setPromptEpisodeId(episodeId),
    onSettled: invalidate,
  });

  const editDate = useMutation({
    mutationFn: async ({ episode, iso }: { episode: EpisodeSummary; iso: string }) => {
      if (episode.watchCount > 0) await removeLatestEpisodeWatch(episode.id);
      return addEpisodeWatch(episode.id, iso);
    },
    onError: reportError,
    onSettled: invalidate,
  });

  const bulkUpToHere = useMutation({
    mutationFn: (episodeId: number) => bulkWatch(requireInternalId(), { upToEpisodeId: episodeId }),
    onError: reportError,
    onSettled: invalidate,
  });

  const markSeasonWatched = useMutation({
    mutationFn: (seasonNumber: number) => bulkWatch(requireInternalId(), { seasonNumber }),
    onError: reportError,
    onSettled: invalidate,
  });

  const unwatchSeason = useMutation({
    mutationFn: (seasonNumber: number) => bulkUnwatch(requireInternalId(), { seasonNumber }),
    onError: reportError,
    onSettled: invalidate,
  });

  const changeNeedsReview = useMutation({
    mutationFn: (needsReview: boolean) => updateSeries(requireInternalId(), { needsReview }),
    onError: reportError,
    onSettled: invalidate,
  });

  const fillMissingSeasons = useMutation({
    mutationFn: async () => {
      if (!query.data) return;
      const detail = query.data;
      const maxStartedSeason = detail.seasonProgress.seasons.reduce(
        (max, s) => (s.watched > 0 ? Math.max(max, s.number) : max),
        0,
      );
      const promises: Promise<unknown>[] = [];
      for (const s of detail.seasonProgress.seasons) {
        if (s.number !== 0 && s.number < maxStartedSeason && s.watched < s.total) {
          promises.push(bulkWatch(detail.id, { seasonNumber: s.number }));
        }
      }
      await Promise.all(promises);
      await updateSeries(detail.id, { needsReview: false });
    },
    onError: reportError,
    onSettled: invalidate,
  });

  const changeManualList = useMutation<
    SeriesSummary,
    unknown,
    ManualList | null,
    { previous: SeriesDetail | undefined }
  >({
    mutationFn: (manualList: ManualList | null) =>
      updateSeries(requireInternalId(), { manualList }),
    onMutate: async (manualList) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SeriesDetail>(queryKey);
      queryClient.setQueryData<SeriesDetail>(queryKey, (old) => old && { ...old, manualList });
      return { previous };
    },
    onError: (err, _manualList, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      // E20 race: the server re-checked the dynamic category and rejected the change.
      toast.show(err instanceof ApiError ? err.message : t("errors.generic"), "error");
    },
    onSettled: invalidate,
  });

  const refreshSeriesMutation = useMutation({
    mutationFn: () => refreshSeries(requireInternalId()),
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
    mutationFn: (pushMuted: boolean) => updateSeries(requireInternalId(), { pushMuted }),
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

  const toggleFavorite = useMutation<
    SeriesSummary,
    unknown,
    boolean,
    { previous: SeriesDetail | undefined }
  >({
    mutationFn: (favorite: boolean) => updateSeries(requireInternalId(), { favorite }),
    onMutate: async (favorite) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SeriesDetail>(queryKey);
      queryClient.setQueryData<SeriesDetail>(queryKey, (old) => old && { ...old, favorite });
      return { previous };
    },
    onError: (_err, _favorite, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      reportError();
    },
    onSettled: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: () => removeSeries(requireInternalId()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library"] });
      navigate({ to: "/watch" });
    },
    onError: () => toast.show(t("library.removeError"), "error"),
  });

  function handleRemove() {
    if (detail) {
      setShowRemoveDialog(true);
    }
  }

  const rateItem = useMutation<
    unknown,
    unknown,
    1 | 2 | 3 | null,
    { previous: SeriesDetail | undefined }
  >({
    mutationFn: (value) =>
      value === null
        ? clearRating("item", requireInternalId())
        : setRating("item", requireInternalId(), value),
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

  const rateEpisode = useMutation<
    unknown,
    unknown,
    { episodeId: number; value: 1 | 2 | 3 | null },
    { previous: SeriesDetail | undefined }
  >({
    mutationFn: ({ episodeId, value }) =>
      value === null ? clearRating("episode", episodeId) : setRating("episode", episodeId, value),
    onMutate: async ({ episodeId, value }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SeriesDetail>(queryKey);
      queryClient.setQueryData<SeriesDetail>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          seasons: old.seasons.map((season) => ({
            ...season,
            episodes: season.episodes.map((ep) =>
              ep.id === episodeId ? { ...ep, myRating: value } : ep,
            ),
          })),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      reportError();
    },
    onSuccess: () => setPromptEpisodeId(null),
    onSettled: invalidate,
  });

  if (query.isLoading) {
    return <div className="h-64 animate-pulse bg-white/5" />;
  }

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.code === "NOT_FOUND";
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
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
        <Link to="/" className="text-sm text-muted underline">
          {t("app.nav.library")}
        </Link>
      </div>
    );
  }

  const detail = query.data;
  if (!detail) return null;

  // Same size as SeriesCard's poster (buildImageUrl's "medium" default) so the
  // <img> src doesn't change across the card->detail view-transition morph —
  // a differing size forces a reload mid-transition instead of a smooth flow.
  const imageUrl = buildImageUrl(detail.posterRef);
  const backdropUrl = buildImageUrl(detail.backdropRef, "large");
  const { watched, aired } = detail.progress;
  const sortedSeasons = sortSeasonsSpecialsLast(detail.seasons);
  const carouselEpisodes = detail.seasons
    .filter((season) => season.number !== 0)
    .flatMap((season) => season.episodes);
  const contentRating =
    detail.contentRatings.find((r) => r.region === activeRegion) ?? detail.contentRatings[0];
  const regionWatchProviders = detail.watchProviders.filter((wp) => wp.region === activeRegion);
  const avgRuntimeMin = averageEpisodeRuntimeMin(detail);

  return (
    <div className="flex flex-col gap-6">
      <section className="relative -mx-3 sm:-mx-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {backdropUrl && (
            <MediaImage
              src={backdropUrl}
              alt=""
              wrapperClassName="absolute inset-0 block size-full bg-void"
              className="size-full object-cover object-top"
              fadeDurationMs={1200}
              spinnerSize={24}
              fetchPriority="high"
            />
          )}
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-void via-transparent to-void sm:block" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/20 to-void" />
        </div>

        <div className="relative z-10 flex min-h-[24rem] items-end gap-4 px-3 pb-6 pt-20 sm:min-h-[30rem] sm:gap-6 sm:px-6 sm:pt-32">
          {imageUrl ? (
            <MediaImage
              src={imageUrl}
              alt={detail.title}
              wrapperClassName="block aspect-[2/3] w-28 shrink-0 bg-white/5 shadow-2xl sm:w-40"
              className="h-full w-full object-cover"
              style={{ viewTransitionName: `poster-${detail.id}` }}
              spinnerSize={24}
              fetchPriority="high"
            />
          ) : (
            <div
              className="flex aspect-[2/3] w-28 shrink-0 items-center justify-center overflow-hidden bg-white/5 p-2 text-center text-sm text-muted sm:w-40"
              style={{ viewTransitionName: `poster-${detail.id}` }}
            >
              {detail.title}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <h1 className="min-w-0 flex-1 font-display italic text-2xl text-snow leading-none tracking-tight sm:text-4xl">
                {detail.title}
                {detail.year ? (
                  <span className="ml-2 font-sans text-base text-snow/60 not-italic sm:text-2xl">
                    ({detail.year})
                  </span>
                ) : (
                  ""
                )}
              </h1>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label={t("series.menu")}
                  className="px-2 py-1 text-muted hover:text-snow transition-colors"
                >
                  ⋮
                </button>
                <Modal
                  isOpen={menuOpen}
                  onClose={() => setMenuOpen(false)}
                  desktop="popover"
                  popoverClassName="w-56"
                  title={t("series.menu")}
                  className="!p-0 !overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      toggleFavorite.mutate(!detail.favorite);
                    }}
                    aria-pressed={detail.favorite}
                    className="flex w-full items-center gap-2 border-b border-white/5 px-4 py-3.5 text-left text-xs font-mono text-muted transition-colors hover:bg-white/5 hover:text-snow"
                  >
                    <Heart size={16} className={detail.favorite ? "fill-yellow text-yellow" : ""} />
                    {t(detail.favorite ? "series.unfavorite" : "series.favorite")}
                  </button>
                  <div className="border-b border-white/5 px-4 py-3.5">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                      {t("rating.label")}
                    </p>
                    <RatingControl
                      value={detail.rating}
                      onChange={(value) => rateItem.mutate(value)}
                      size="sm"
                    />
                  </div>
                  {detail.manualList !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        changeManualList.mutate(null);
                      }}
                      className="block w-full px-4 py-3.5 text-left text-xs font-mono text-muted hover:text-snow hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                      {t("category.watching")}
                    </button>
                  )}
                  {detail.manualList !== "watch_later" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        changeManualList.mutate("watch_later");
                      }}
                      className="block w-full px-4 py-3.5 text-left text-xs font-mono text-muted hover:text-snow hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                      {t("manualList.watch_later")}
                    </button>
                  )}
                  {detail.manualList !== "stopped" && detail.category !== "finished" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        changeManualList.mutate("stopped");
                      }}
                      className="block w-full px-4 py-3.5 text-left text-xs font-mono text-muted hover:text-snow hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                      {t("manualList.stopped")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      refreshSeriesMutation.mutate();
                    }}
                    className="block w-full px-4 py-3.5 text-left text-xs font-mono text-muted hover:text-snow hover:bg-white/5 transition-colors border-b border-white/5"
                  >
                    {t("series.refresh")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      toggleMute.mutate(!detail.pushMuted);
                    }}
                    className="block w-full px-4 py-3.5 text-left text-xs font-mono text-muted hover:text-snow hover:bg-white/5 transition-colors border-b border-white/5"
                  >
                    {detail.pushMuted ? t("series.unmute") : t("series.mute")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleRemove();
                    }}
                    className="block w-full px-4 py-3.5 text-left text-xs font-mono text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                  >
                    {t("library.card.remove")}
                  </button>
                </Modal>
              </div>
            </div>
            {detail.tagline && <p className="text-sm text-muted italic">"{detail.tagline}"</p>}

            {(detail.networks.length > 0 || contentRating || avgRuntimeMin != null) && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                {detail.networks.map((n) => (
                  <LogoOrText key={n.name} src={buildImageUrl(n.logoRef, "thumb")} alt={n.name} />
                ))}
                {contentRating && (
                  <span className="border border-white/10 px-1.5 py-0.5 text-xs">
                    {contentRating.rating}
                  </span>
                )}
                {avgRuntimeMin != null && (
                  <span className="font-mono text-xs tabular-nums">
                    {t("episode.runtimeMin", { minutes: avgRuntimeMin })}
                  </span>
                )}
              </div>
            )}

            {detail.genres.length > 0 && (
              <div className="flex flex-nowrap gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {detail.genres.map((g) => (
                  <span
                    key={g.id ?? g.name}
                    className="shrink-0 bg-white/5 px-2 py-0.5 text-xs text-muted"
                  >
                    {t(`genres.${genreKey(g.name)}`, { defaultValue: g.name })}
                  </span>
                ))}
              </div>
            )}

            {detail.tags.length > 0 && (
              <div className="flex flex-nowrap gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {detail.tags.map((tag) => (
                  <span
                    key={`${tag.source}-${tag.id ?? tag.name}`}
                    className="shrink-0 bg-white/5 px-2 py-0.5 text-xs text-yellow"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {detail.externalRatings.length > 0 && (
              <p className="text-sm text-muted">
                {detail.externalRatings.map((r, i) => (
                  <span key={r.source}>
                    {i > 0 && t("common.separator")}⭐ {r.source.toUpperCase()}{" "}
                    {(r.scale === 10 ? r.value : (r.value / r.scale) * 10).toFixed(1)}
                  </span>
                ))}
              </p>
            )}

            {regionWatchProviders.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  {regionWatchProviders.map((wp) => {
                    return (
                      <span
                        key={`${wp.provider}-${wp.type}-${wp.region}`}
                        className="flex items-center gap-1 bg-white/5 px-2 py-1 text-xs text-snow"
                      >
                        <DecorativeLogo
                          src={buildImageUrl(wp.logoRef, "thumb")}
                          className="h-4 w-4 object-cover"
                        />
                        {wp.provider} ({wp.region})
                      </span>
                    );
                  })}
                </div>
                <p className="text-xs text-muted">{t("series.justwatchAttribution")}</p>
              </div>
            )}

            <div className="mt-2 flex flex-col gap-1">
              <SegmentedProgress
                seasonProgress={detail.seasonProgress}
                watched={watched}
                aired={aired}
                category={detail.category}
                size="md"
                className="max-w-sm"
              />
              <p
                className={`text-sm font-mono tabular-nums ${CATEGORY_TEXT_COLORS[detail.category]}`}
              >
                {watched}/{aired}
              </p>
            </div>
          </div>
        </div>
      </section>

      {detail.needsReview && (
        <NeedsReviewBanner
          isLoading={fillMissingSeasons.isPending || changeNeedsReview.isPending}
          onFill={() => fillMissingSeasons.mutate()}
          onDismiss={() => changeNeedsReview.mutate(false)}
        />
      )}

      {detail.nextUnwatched && readUiPrefs().showNextUpCarousel && (
        <NextEpisodeCarousel
          key={detail.id}
          episodes={carouselEpisodes}
          nextEpisode={detail.nextUnwatched}
          promptEpisodeId={promptEpisodeId}
          onToggleWatch={(episode, onMarked) => {
            toggleWatch.mutate(episode, {
              onSuccess: (result) => {
                if (result) onMarked();
              },
            });
          }}
          onWatchAgain={(episodeId) => watchAgain.mutate(episodeId)}
          onEditDate={(episode) => setDateDialogEpisode(episode)}
          onBulkUpToHere={(episodeId) => bulkUpToHere.mutate(episodeId)}
          onRateEpisode={(episodeId, value) => rateEpisode.mutate({ episodeId, value })}
          onDismissPrompt={() => setPromptEpisodeId(null)}
        />
      )}

      <div className="flex flex-col">
        {sortedSeasons.map((season) => (
          <SeasonSection
            key={season.number}
            season={season}
            nextUnwatched={detail.nextUnwatched}
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

      {showRemoveDialog && detail && (
        <RemoveSeriesDialog
          title={detail.title}
          onConfirm={() => removeMutation.mutate()}
          onClose={() => setShowRemoveDialog(false)}
        />
      )}
    </div>
  );
}

/** Prefer provider typical runtimes; else average known per-episode runtimes. */
function averageEpisodeRuntimeMin(detail: SeriesDetail): number | null {
  const fromItem = detail.episodeRunTimes ?? [];
  if (fromItem.length > 0) {
    return Math.round(fromItem.reduce((a, b) => a + b, 0) / fromItem.length);
  }
  const fromEpisodes = detail.seasons
    .flatMap((season) => season.episodes)
    .map((ep) => ep.runtimeMin)
    .filter((m): m is number => m != null);
  if (fromEpisodes.length === 0) return null;
  return Math.round(fromEpisodes.reduce((a, b) => a + b, 0) / fromEpisodes.length);
}
