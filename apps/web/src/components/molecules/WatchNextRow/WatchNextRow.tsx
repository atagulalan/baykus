import type { SeriesSummary } from "../../../api/types.ts";
import { isEpisodeAired } from "../../../lib/airing.ts";
import { EpisodeRow } from "../../organisms/EpisodeRow/EpisodeRow.tsx";

/** E28: how many more aired episodes queue behind the shown next one, hidden when 0. */
export function computeOverflowBadge(progress: { aired: number; watched: number }): number {
  return Math.max(0, progress.aired - progress.watched - 1);
}

/** E29: hide the quick-mark checkbox when the next episode has not aired yet. */
export function shouldShowQuickMarkCheckbox(ep: {
  airDate: string | null;
  airStamp?: string | null;
}): boolean {
  return isEpisodeAired(ep);
}

interface WatchNextRowProps {
  series: SeriesSummary;
  onQuickMark: (episodeId: number) => void;
  /** E137: quick-mark in flight for this row — checkbox renders checked and
   * further clicks are ignored; the row carries the fly transition name. */
  marking?: boolean;
}

/** One row in the watch page's "next up" / "haven't watched for a while" sections. */
export function WatchNextRow({ series, onQuickMark, marking = false }: WatchNextRowProps) {
  const next = series.nextUnwatched;
  if (!next) return null; // E29 says this shouldn't happen for these categories; defensive.

  const overflow = computeOverflowBadge(series.progress);
  const showCheckbox = shouldShowQuickMarkCheckbox(next);

  return (
    <EpisodeRow
      embedded
      posterStretch
      itemId={series.id}
      tmdbId={series.tmdbId}
      seriesTitle={series.title}
      posterRef={series.posterRef}
      s={next.s}
      e={next.e}
      overflow={overflow}
      episodeTitle={next.title}
      airDate={next.airDate}
      airStamp={next.airStamp}
      episodeType={next.episodeType}
      detailsEpisodeId={next.episodeId}
      watched={marking}
      {...(showCheckbox
        ? {
            onToggleWatch: () => {
              if (!marking) onQuickMark(next.episodeId);
            },
          }
        : {})}
      {...(marking ? { transitionName: "quickmark-fly" } : {})}
    />
  );
}
