import type { CalendarEntry } from "../../../api/types.ts";
import { EpisodeRow } from "../../organisms/EpisodeRow/EpisodeRow.tsx";

interface CalendarEntryRowProps {
  entry: CalendarEntry;
  /** E81: filled checkbox + dimmed content for a row checked off this session. */
  watched?: boolean;
  onToggleWatched?: () => void;
}

/** Timeline / month list adapter — compact EpisodeRow with series chrome + details on click. */
export function CalendarEntryRow({
  entry,
  watched = false,
  onToggleWatched,
}: CalendarEntryRowProps) {
  const provider = entry.watchProviders[0];
  const networkOrProvider = provider ? `${provider.provider} (${provider.region})` : entry.network;

  return (
    <EpisodeRow
      embedded
      posterStretch
      s={entry.s}
      e={entry.e}
      episodeTitle={entry.episodeTitle}
      airDate={entry.airDate}
      airStamp={entry.airStamp}
      episodeType={entry.episodeType}
      itemId={entry.itemId}
      seriesTitle={entry.title}
      posterRef={entry.posterRef}
      seasonName={entry.seasonName}
      excludeTags={["upcoming"]}
      muted={watched}
      watched={watched}
      detailsEpisodeId={entry.episodeId}
      {...(networkOrProvider ? { networkOrProvider } : {})}
      {...(onToggleWatched ? { onToggleWatch: onToggleWatched } : {})}
    />
  );
}
