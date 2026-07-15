import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { buildImageUrl } from "../api/images.ts";
import type { SeriesSummary } from "../api/types.ts";
import { EpisodeTags } from "./EpisodeTags.tsx";

interface WatchNextRowProps {
  series: SeriesSummary;
  onQuickMark: (episodeId: number) => void;
}

/** E28: how many more aired episodes queue behind the shown next one, hidden when 0. */
export function computeOverflowBadge(progress: { aired: number; watched: number }): number {
  return Math.max(0, progress.aired - progress.watched - 1);
}

/** E29: hide the quick-mark checkbox when the next episode's airDate is null or in the future. */
export function shouldShowQuickMarkCheckbox(airDate: string | null, today: string): boolean {
  return airDate !== null && airDate <= today;
}

/** One row in the watch page's "next up" / "haven't watched for a while" sections. */
export function WatchNextRow({ series, onQuickMark }: WatchNextRowProps) {
  const { t } = useTranslation();
  const next = series.nextUnwatched;
  if (!next) return null; // E29 says this shouldn't happen for these categories; defensive.

  const imageUrl = buildImageUrl(series.posterRef);
  const overflow = computeOverflowBadge(series.progress);
  const today = new Date().toISOString().slice(0, 10);
  const showCheckbox = shouldShowQuickMarkCheckbox(next.airDate, today);

  return (
    <div className="flex items-center gap-3 rounded px-2 py-2 hover:bg-zinc-900">
      {showCheckbox && (
        <input
          type="checkbox"
          onChange={() => onQuickMark(next.episodeId)}
          aria-label={t("episode.toggleWatched")}
          className="h-4 w-4 shrink-0 accent-emerald-500"
        />
      )}
      <Link
        to="/series/$id"
        params={{ id: String(series.id) }}
        className="flex flex-1 items-center gap-3 overflow-hidden"
      >
        <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-zinc-800">
          {imageUrl && <img src={imageUrl} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
          <span className="truncate font-medium text-sm">{series.title}</span>
          <span className="flex items-center gap-1 truncate text-xs text-zinc-400">
            S{next.s}E{next.e}
            {overflow > 0 && <span className="text-zinc-500">+{overflow}</span>}
            {next.title && <span className="truncate">{next.title}</span>}
          </span>
          <EpisodeTags
            s={next.s}
            e={next.e}
            airDate={next.airDate}
            episodeType={next.episodeType}
          />
        </div>
      </Link>
    </div>
  );
}
