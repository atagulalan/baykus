import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { buildImageUrl } from "../api/images.ts";
import type { EpisodeType, SeriesSummary } from "../api/types.ts";
import { todayIso } from "../lib/date.ts";
import { Checkbox } from "./Checkbox.tsx";
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
  /** Trailing quick-mark checkbox (watch-next sections) or relative timestamp (history), E38/E45. */
  trailing?: ReactNode;
}

/** Shared row shell: poster / title / SxEy(+overflow) / episode title / EpisodeTags,
 * with a trailing checkbox or timestamp (E38, trailing-only layout since E45). */
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
  trailing,
}: EpisodeRowProps) {
  const imageUrl = buildImageUrl(posterRef);

  return (
    <div className="flex items-center gap-4 px-6 py-4 transition-colors border-b border-white/5 hover:bg-white/5">
      <Link
        to="/series/$id"
        params={{ id: String(itemId) }}
        className="flex flex-1 items-center gap-4 overflow-hidden"
      >
        {imageUrl && (
          <div className="h-12 w-8 shrink-0 overflow-hidden bg-[#101010]">
            <img src={imageUrl} alt="" className="h-full w-full object-cover opacity-90" />
          </div>
        )}
        <div className="flex flex-1 flex-col justify-center overflow-hidden">
          <div className="flex items-baseline gap-3">
            <span className="font-display italic text-snow text-base truncate">{title}</span>
            <span className="font-mono text-xs text-muted shrink-0">
              S{s < 10 ? `0${s}` : s}E{e < 10 ? `0${e}` : e}
              {overflow > 0 && <span className="opacity-50 ml-1">+{overflow}</span>}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            {episodeTitle && (
              <span className="font-mono text-[10px] text-muted/70 truncate">{episodeTitle}</span>
            )}
            <EpisodeTags s={s} e={e} airDate={airDate} episodeType={episodeType} />
          </div>
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
      trailing={
        showCheckbox ? (
          <Checkbox
            checked={false}
            onChange={() => onQuickMark(next.episodeId)}
            aria-label={t("episode.toggleWatched")}
          />
        ) : undefined
      }
    />
  );
}
