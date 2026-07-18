import type { SeriesSummary } from "../api/types.ts";
import { todayIso } from "../lib/date.ts";
import { EpisodeRow } from "./EpisodeRow.tsx";

/** E28: how many more aired episodes queue behind the shown next one, hidden when 0. */
export function computeOverflowBadge(progress: { aired: number; watched: number }): number {
  return Math.max(0, progress.aired - progress.watched - 1);
}

/** E29: hide the quick-mark checkbox when the next episode's airDate is null or in the future. */
export function shouldShowQuickMarkCheckbox(airDate: string | null, today: string): boolean {
  return airDate !== null && airDate <= today;
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
  const showCheckbox = shouldShowQuickMarkCheckbox(next.airDate, todayIso());

  return (
    <EpisodeRow
      itemId={series.id}
      seriesTitle={series.title}
      posterRef={series.posterRef}
      s={next.s}
      e={next.e}
      overflow={overflow}
      episodeTitle={next.title}
      airDate={next.airDate}
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
