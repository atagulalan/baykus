import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { buildImageUrl } from "../api/images.ts";
import type { EpisodeType, SeriesSummary } from "../api/types.ts";
import { todayIso } from "../lib/date.ts";
import { EpisodeTags } from "./EpisodeTags.tsx";

/** E28: how many more aired episodes queue behind the shown next one, hidden when 0. */
export function computeOverflowBadge(progress: { aired: number; watched: number }): number {
  return Math.max(0, progress.aired - progress.watched - 1);
}

/** E29: hide the quick-mark checkbox when the next episode's airDate is null or in the future. */
export function shouldShowQuickMarkCheckbox(airDate: string | null, today: string): boolean {
  return airDate !== null && airDate <= today;
}

export interface EpisodeRowProps {
  itemId: number;
  posterRef: string | null;
  title: string;
  s: number;
  e: number;
  overflow?: number;
  episodeTitle: string | null;
  airDate: string | null;
  episodeType: EpisodeType | null;
  /** Leading quick-mark checkbox (watch-next sections) — mutually exclusive with `trailing`. */
  leading?: ReactNode;
  /** Trailing relative timestamp (history) — mutually exclusive with `leading`. */
  trailing?: ReactNode;
}

/** Shared row shell: poster / title / SxEy(+overflow) / episode title / EpisodeTags,
 * with either a leading checkbox or a trailing timestamp (E38). */
export function EpisodeRow({
  itemId,
  posterRef,
  title,
  s,
  e,
  overflow = 0,
  episodeTitle,
  airDate,
  episodeType,
  leading,
  trailing,
}: EpisodeRowProps) {
  const imageUrl = buildImageUrl(posterRef);

  return (
    <div className="flex items-center gap-3 rounded px-2 py-2 hover:bg-zinc-900">
      {leading}
      <Link
        to="/series/$id"
        params={{ id: String(itemId) }}
        className="flex flex-1 items-center gap-3 overflow-hidden"
      >
        <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-zinc-800">
          {imageUrl && <img src={imageUrl} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
          <span className="truncate font-medium text-sm">{title}</span>
          <span className="flex items-center gap-1 truncate text-xs text-zinc-400">
            S{s}E{e}
            {overflow > 0 && <span className="text-zinc-500">+{overflow}</span>}
            {episodeTitle && <span className="truncate">{episodeTitle}</span>}
          </span>
          <EpisodeTags s={s} e={e} airDate={airDate} episodeType={episodeType} />
        </div>
      </Link>
      {trailing}
    </div>
  );
}

interface WatchNextRowProps {
  series: SeriesSummary;
  onQuickMark: (episodeId: number) => void;
}

/** One row in the watch page's "next up" / "haven't watched for a while" sections. */
export function WatchNextRow({ series, onQuickMark }: WatchNextRowProps) {
  const { t } = useTranslation();
  const next = series.nextUnwatched;
  if (!next) return null; // E29 says this shouldn't happen for these categories; defensive.

  const overflow = computeOverflowBadge(series.progress);
  const showCheckbox = shouldShowQuickMarkCheckbox(next.airDate, todayIso());

  return (
    <EpisodeRow
      itemId={series.id}
      posterRef={series.posterRef}
      title={series.title}
      s={next.s}
      e={next.e}
      overflow={overflow}
      episodeTitle={next.title}
      airDate={next.airDate}
      episodeType={next.episodeType}
      leading={
        showCheckbox ? (
          <input
            type="checkbox"
            onChange={() => onQuickMark(next.episodeId)}
            aria-label={t("episode.toggleWatched")}
            className="h-4 w-4 shrink-0 accent-emerald-500"
          />
        ) : undefined
      }
    />
  );
}
