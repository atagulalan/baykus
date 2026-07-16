import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildImageUrl } from "../api/images.ts";
import type { CalendarEntry } from "../api/types.ts";
import { Checkbox } from "./Checkbox.tsx";
import { EpisodeTags } from "./EpisodeTags.tsx";

interface CalendarEntryRowProps {
  entry: CalendarEntry;
  /** E81: filled checkbox + dimmed content for a row checked off this session. */
  watched?: boolean;
  onToggleWatched?: () => void;
}

/** Timeline-style row (poster thumb + title + tags), shared by the timeline view and the
 * mobile month list (E35). */
export function CalendarEntryRow({
  entry,
  watched = false,
  onToggleWatched,
}: CalendarEntryRowProps) {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = buildImageUrl(entry.posterRef);
  const provider = entry.watchProviders[0];
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-white/5">
      <Link
        to="/series/$id"
        params={{ id: `i${entry.itemId}` }}
        className={`flex flex-1 items-center gap-2 ${watched ? "opacity-60" : ""}`}
      >
        <div className="h-14 w-10 shrink-0 overflow-hidden bg-white/5">
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
          <span className="shrink-0 text-xs text-muted">
            {provider ? `${provider.provider} (${provider.region})` : entry.network}
          </span>
        )}
      </Link>
      {onToggleWatched && (
        <Checkbox
          checked={watched}
          onChange={onToggleWatched}
          aria-label={t("episode.toggleWatched")}
        />
      )}
    </div>
  );
}
