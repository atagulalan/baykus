import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ApiError,
  addEpisodeWatch,
  bulkUnwatch,
  bulkWatch,
  clearRating,
  refreshSeries,
  removeLatestEpisodeWatch,
  removeSeries,
  setRating,
  updateSeries,
} from "../../api/client.ts";
import type {
  AddWatchResult,
  EpisodeSummary,
  ManualList,
  SeriesDetail,
  SeriesSummary,
} from "../../api/types.ts";
import { pageViewTransition } from "../../lib/pageViewTransition.ts";
import { shouldPromptEpisodeRating } from "../../lib/shouldPromptEpisodeRating.ts";
import { useToast } from "../../lib/toast.tsx";

export function updateEpisodeInDetail(
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

interface UseSeriesDetailMutationsOptions {
  param: string;
  detail: SeriesDetail | undefined;
  onPromptEpisodeRating: (episodeId: number | null) => void;
}

export function useSeriesDetailMutations({
  param,
  detail,
  onPromptEpisodeRating,
}: UseSeriesDetailMutationsOptions) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const queryKey = ["series", param] as const;

  function requireInternalId(): number {
    const value = detail?.id;
    if (value === undefined) throw new Error("mutation fired before series detail loaded");
    return value;
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
      if (result && shouldPromptEpisodeRating(episode.myRating)) {
        onPromptEpisodeRating(episode.id);
      }
    },
    onSettled: invalidate,
  });

  const watchAgain = useMutation({
    mutationFn: (episodeId: number) => addEpisodeWatch(episodeId),
    onError: reportError,
    onSuccess: (_result, episodeId) => {
      const episode = queryClient
        .getQueryData<SeriesDetail>(queryKey)
        ?.seasons.flatMap((season) => season.episodes)
        .find((ep) => ep.id === episodeId);
      if (shouldPromptEpisodeRating(episode?.myRating)) {
        onPromptEpisodeRating(episodeId);
      }
    },
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
      if (!detail) return;
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
      navigate({ to: "/watch", viewTransition: pageViewTransition });
    },
    onError: () => toast.show(t("library.removeError"), "error"),
  });

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
    onSuccess: () => onPromptEpisodeRating(null),
    onSettled: invalidate,
  });

  return {
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
  };
}
