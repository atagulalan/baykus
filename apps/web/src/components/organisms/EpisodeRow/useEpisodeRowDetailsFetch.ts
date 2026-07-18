import { useQuery } from "@tanstack/react-query";
import { getSeriesByParam } from "../../../api/client.ts";
import { buildImageUrl } from "../../../api/images.ts";
import type { EpisodeType } from "../../../api/types.ts";

interface UseEpisodeRowDetailsFetchParams {
  showDetailsModal: boolean;
  itemId?: number | undefined;
  detailsEpisodeId?: number | undefined;
  overviewProp?: string | null | undefined;
  stillRefProp?: string | null | undefined;
  runtimeMin?: number | null | undefined;
  watchCount: number;
  lastWatchedAtProp?: string | null | undefined;
  episodeTitle: string | null;
  airDate: string | null;
  episodeType: EpisodeType | null;
}

export function useEpisodeRowDetailsFetch({
  showDetailsModal,
  itemId,
  detailsEpisodeId,
  overviewProp,
  stillRefProp = null,
  runtimeMin = null,
  watchCount,
  lastWatchedAtProp = null,
  episodeTitle,
  airDate,
  episodeType,
}: UseEpisodeRowDetailsFetchParams) {
  const seriesParam = itemId != null ? `i${itemId}` : null;
  const shouldFetchDetails =
    showDetailsModal && itemId != null && detailsEpisodeId != null && seriesParam != null;
  const { data: series } = useQuery({
    queryKey: ["series", seriesParam],
    queryFn: () => getSeriesByParam(seriesParam as string),
    enabled: shouldFetchDetails,
  });
  const fetchedEpisode = series?.seasons
    .flatMap((season) => season.episodes)
    .find((ep) => ep.id === detailsEpisodeId);

  const overview =
    detailsEpisodeId != null
      ? series == null
        ? undefined
        : (fetchedEpisode?.overview ?? null)
      : (overviewProp ?? null);
  const stillRef = fetchedEpisode?.stillRef ?? stillRefProp;
  const detailRuntime = fetchedEpisode?.runtimeMin ?? runtimeMin;
  const detailWatchCount = fetchedEpisode?.watchCount ?? watchCount;
  const detailLastWatched = fetchedEpisode?.lastWatchedAt ?? lastWatchedAtProp;
  const detailTitle = fetchedEpisode?.title ?? episodeTitle;
  const detailAirDate = fetchedEpisode?.airDate ?? airDate;
  const detailType = fetchedEpisode?.episodeType ?? episodeType;
  const stillImageUrl = buildImageUrl(stillRef, "thumb");

  return {
    overview,
    stillRef,
    detailRuntime,
    detailWatchCount,
    detailLastWatched,
    detailTitle,
    detailAirDate,
    detailType,
    stillImageUrl,
  };
}
