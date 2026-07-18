import { useTranslation } from "react-i18next";
import type { EpisodeSummary, NextUnwatchedEpisode } from "../api/types.ts";
import { todayIso } from "../lib/date.ts";
import { EpisodeRow } from "./EpisodeRow.tsx";

interface NextUpCardProps {
  episode: EpisodeSummary;
  nextEpisode: NextUnwatchedEpisode;
  promptEpisodeId: number | null;
  onToggleWatch: () => void;
  onWatchAgain: () => void;
  onEditDate: () => void;
  onBulkUpToHere: () => void;
  onRateEpisode: (value: 1 | 2 | 3 | null) => void;
  onDismissPrompt: () => void;
}

/** 011 E152 — single next-episode card on series detail (replaces E144 carousel). */
export function NextUpCard({
  episode,
  nextEpisode,
  promptEpisodeId,
  onToggleWatch,
  onWatchAgain,
  onEditDate,
  onBulkUpToHere,
  onRateEpisode,
  onDismissPrompt,
}: NextUpCardProps) {
  const { t } = useTranslation();
  const today = todayIso();
  const isAired = episode.airDate !== null && episode.airDate <= today;
  const hasUnwatchedBefore =
    episode.s > nextEpisode.s || (episode.s === nextEpisode.s && episode.e > nextEpisode.e);

  return (
    <section className="flex flex-col gap-1 border border-white/5 bg-[#101010] pt-3 pb-1">
      <h2 className="px-4 text-center font-semibold text-base text-snow">{t("series.nextUp")}</h2>
      <EpisodeRow
        s={episode.s}
        e={episode.e}
        episodeTitle={episode.title}
        airDate={episode.airDate}
        episodeType={episode.episodeType}
        runtimeMin={episode.runtimeMin}
        watchCount={episode.watchCount}
        overview={episode.overview}
        stillRef={episode.stillRef}
        lastWatchedAt={episode.lastWatchedAt}
        myRating={episode.myRating}
        watched={episode.watchCount > 0}
        muted={!isAired}
        checkboxDisabled={!isAired}
        onToggleWatch={onToggleWatch}
        onWatchAgain={onWatchAgain}
        onEditDate={onEditDate}
        onBulkUpToHere={onBulkUpToHere}
        hasUnwatchedBefore={hasUnwatchedBefore}
        showRatingPrompt={promptEpisodeId === episode.id}
        onRate={onRateEpisode}
        onDismissPrompt={onDismissPrompt}
      />
    </section>
  );
}
