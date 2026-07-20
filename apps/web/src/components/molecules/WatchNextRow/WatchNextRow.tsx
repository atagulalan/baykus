import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SeriesSummary } from "../../../api/types.ts";
import { buildImageUrl } from "../../../api/images.ts";
import { formatAirDateLabel } from "../../../lib/airDateLabel.ts";
import { isEpisodeAired } from "../../../lib/airing.ts";
import { pageViewTransition } from "../../../lib/pageViewTransition.ts";
import { seriesParam as seriesPathParam } from "../../../lib/seriesPath.ts";
import { MediaImage } from "../../atoms/MediaImage/MediaImage.tsx";
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

function CaughtUpWatchRow({ series }: { series: SeriesSummary }) {
  const { t, i18n } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const seriesRouteParam = seriesPathParam({ id: series.id, tmdbId: series.tmdbId });
  const imageUrl = buildImageUrl(series.posterRef);
  const subtitle = series.nextAirDate
    ? formatAirDateLabel(series.nextAirDate, i18n.language)
    : t("series.refreshUpToDate");

  return (
    <Link
      to="/series/$id"
      params={{ id: seriesRouteParam }}
      viewTransition={pageViewTransition}
      className="episode-row list-inset flex min-w-0 items-stretch gap-0 rounded-md border-white/5 border-b py-2 pl-3 pr-3 transition-colors hover:bg-white/[0.04]"
    >
      <span className="js-poster w-12 shrink-0 self-stretch overflow-hidden rounded-md bg-white/5 sm:w-14">
        {imageUrl && !imageFailed ? (
          <MediaImage
            src={imageUrl}
            alt=""
            wrapperClassName="block h-full w-full"
            className="h-full w-full object-cover opacity-90"
            spinnerSize={12}
            onError={() => setImageFailed(true)}
          />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden py-2 pl-4">
        <span className="truncate font-display text-base text-snow italic">{series.title}</span>
        <span className="truncate font-mono text-muted text-xs">{subtitle}</span>
      </span>
    </Link>
  );
}

/** One row in a Watch list category section (next-up chrome, or no-next fallback). */
export function WatchNextRow({ series, onQuickMark, marking = false }: WatchNextRowProps) {
  const next = series.nextUnwatched;
  // E186: every series in an enabled section stays visible — finished / stopped /
  // caught-up rows have no queued episode but still belong in their section.
  if (!next) {
    return <CaughtUpWatchRow series={series} />;
  }

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
