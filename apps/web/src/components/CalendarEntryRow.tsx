import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getSeriesByParam, getSettings } from "../api/client.ts";
import { buildImageUrl } from "../api/images.ts";
import type { CalendarEntry } from "../api/types.ts";
import { Checkbox } from "./Checkbox.tsx";
import { EpisodeLabel } from "./EpisodeLabel.tsx";
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
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = buildImageUrl(entry.posterRef);
  const provider = entry.watchProviders[0];
  const hideSpoilers = (settings?.spoilerProtection ?? false) && !watched;
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-white/5">
      <Link
        to="/series/$id"
        params={{ id: `i${entry.itemId}` }}
        className={`flex min-w-0 flex-1 items-center gap-2 ${watched ? "opacity-60" : ""}`}
        onMouseEnter={() => {
          queryClient.prefetchQuery({
            queryKey: ["series", `i${entry.itemId}`],
            queryFn: () => getSeriesByParam(`i${entry.itemId}`),
          });
        }}
        onClickCapture={(e) => {
          document
            .querySelectorAll(`[style*="view-transition-name: poster-${entry.itemId}"]`)
            .forEach((el) => {
              (el as HTMLElement).style.viewTransitionName = "";
            });
          const poster = e.currentTarget.querySelector(".js-poster") as HTMLElement;
          if (poster) {
            poster.style.viewTransitionName = `poster-${entry.itemId}`;
          }
        }}
      >
        <div className="js-poster h-14 w-10 shrink-0 overflow-hidden bg-white/5">
          {imageUrl && !imageFailed && (
            <img
              src={imageUrl}
              alt=""
              className={`h-full w-full object-cover ${hideSpoilers ? "blur-md" : ""}`}
              onError={() => setImageFailed(true)}
            />
          )}
        </div>
        <span className={`flex-1 truncate ${hideSpoilers ? "blur-sm" : ""}`}>
          {entry.title} <EpisodeLabel s={entry.s} e={entry.e} />
        </span>
        <EpisodeTags
          s={entry.s}
          e={entry.e}
          airDate={entry.airDate}
          episodeType={entry.episodeType}
          episodeTitle={entry.episodeTitle}
          seasonName={entry.seasonName}
          excludeTags={["upcoming"]}
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
          showHint
          onChange={onToggleWatched}
          aria-label={t("episode.toggleWatched")}
        />
      )}
    </div>
  );
}
