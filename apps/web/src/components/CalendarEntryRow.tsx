import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildImageUrl } from "../api/images.ts";
import type { CalendarEntry } from "../api/types.ts";
import { EpisodeTags } from "./EpisodeTags.tsx";

interface CalendarEntryRowProps {
  entry: CalendarEntry;
  onToggleWatched?: () => void;
}

/** Timeline-style row (poster thumb + title + tags), shared by the timeline view and the
 * mobile month list (E35). */
export function CalendarEntryRow({ entry, onToggleWatched }: CalendarEntryRowProps) {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = buildImageUrl(entry.posterRef);
  const provider = entry.watchProviders[0];
  return (
    <div className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-900">
      {onToggleWatched && (
        <input
          type="checkbox"
          onChange={onToggleWatched}
          aria-label={t("episode.toggleWatched")}
          className="h-4 w-4 shrink-0 accent-emerald-500"
        />
      )}
      <Link
        to="/series/$id"
        params={{ id: String(entry.itemId) }}
        className="flex flex-1 items-center gap-2"
      >
        <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-zinc-800">
          {imageUrl && !imageFailed && (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          )}
        </div>
        <span className="flex-1 truncate">
          {entry.title} S{entry.s}E{entry.e}
        </span>
        <EpisodeTags
          s={entry.s}
          e={entry.e}
          airDate={entry.airDate}
          episodeType={entry.episodeType}
          episodeTitle={entry.episodeTitle}
          seasonName={entry.seasonName}
        />
        {(provider || entry.network) && (
          <span className="shrink-0 text-xs text-zinc-500">
            {provider ? `${provider.provider} (${provider.region})` : entry.network}
          </span>
        )}
      </Link>
    </div>
  );
}
