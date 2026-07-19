import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SeasonSummary } from "../../../api/types.ts";
import { isEpisodeAired } from "../../../lib/airing.ts";
import { CircularProgress } from "../../atoms/CircularProgress/CircularProgress.tsx";
import { UnwatchSeasonDialog } from "../../dialogs/UnwatchSeasonDialog/UnwatchSeasonDialog.tsx";
import { SectionHeader } from "../../molecules/SectionHeader/SectionHeader.tsx";
import { EpisodeRow } from "../EpisodeRow/EpisodeRow.tsx";
import { SeasonActionsMenu } from "../SeasonActionsMenu/SeasonActionsMenu.tsx";

interface SeasonSectionProps {
  season: SeasonSummary;
  nextUnwatched: { s: number; e: number } | null;
  onToggleWatch: (episodeId: number) => void;
  onWatchAgain: (episodeId: number) => void;
  onEditDate: (episodeId: number) => void;
  onBulkUpToHere: (episodeId: number) => void;
  onMarkSeasonWatched: () => void;
  onUnwatchSeason: () => void;
  promptEpisodeId: number | null;
  onRateEpisode: (episodeId: number, value: 1 | 2 | 3 | null) => void;
  onDismissPrompt: () => void;
}

/** Extreme ends read as a plain total; mid-progress keeps the ratio. */
export function formatSeasonCount(watched: number, total: number, complete: boolean): string {
  if (watched === 0 || complete) return String(total);
  return `${watched}/${total}`;
}

export function SeasonSection({
  season,
  nextUnwatched,
  onToggleWatch,
  onWatchAgain,
  onEditDate,
  onBulkUpToHere,
  onMarkSeasonWatched,
  onUnwatchSeason,
  promptEpisodeId,
  onRateEpisode,
  onDismissPrompt,
}: SeasonSectionProps) {
  const { t } = useTranslation();

  const airedEpisodes = season.episodes.filter((e) => isEpisodeAired(e));
  const airedCount = airedEpisodes.length;
  const watchedAiredCount = airedEpisodes.filter((e) => e.watchCount > 0).length;
  const watchedCount = season.episodes.filter((e) => e.watchCount > 0).length;
  const complete = airedCount > 0 && watchedAiredCount >= airedCount;
  const progressPct = airedCount === 0 ? 0 : (watchedAiredCount / airedCount) * 100;

  // Only the season you're currently on (the one holding the next unwatched
  // episode) opens by default. Completed seasons, not-yet-started later
  // seasons, and Specials (season 0) all start collapsed.
  const isCurrentSeason =
    season.number !== 0 && nextUnwatched !== null && season.number === nextUnwatched.s;
  const [expanded, setExpanded] = useState(isCurrentSeason);
  const [showUnwatchDialog, setShowUnwatchDialog] = useState(false);

  const label =
    season.name ??
    (season.number === 0
      ? t("series.specials")
      : t("series.seasonNumber", { number: season.number }));

  return (
    <div className="flex flex-col">
      <SectionHeader
        leading={<CircularProgress value={progressPct} complete={complete} />}
        label={label}
        count={formatSeasonCount(watchedCount, season.episodes.length, complete)}
        inset="list"
        onClick={() => setExpanded((v) => !v)}
        expanded={expanded}
        action={
          <SeasonActionsMenu
            canMarkWatched={airedCount > 0 && !complete}
            canUnwatch={watchedCount > 0}
            onMarkSeasonWatched={onMarkSeasonWatched}
            onUnwatchSeason={() => setShowUnwatchDialog(true)}
          />
        }
      />
      {showUnwatchDialog && (
        <UnwatchSeasonDialog
          onClose={() => setShowUnwatchDialog(false)}
          onConfirm={() => onUnwatchSeason()}
        />
      )}
      <div data-expanded={expanded} className="section-collapse">
        <div className="flex flex-col gap-0.5 pt-2">
          {season.episodes.map((episode) => {
            const hasUnwatchedBefore =
              nextUnwatched !== null &&
              (episode.s > nextUnwatched.s ||
                (episode.s === nextUnwatched.s && episode.e > nextUnwatched.e));
            return (
              <EpisodeRow
                key={episode.id}
                s={episode.s}
                e={episode.e}
                episodeTitle={episode.title}
                airDate={episode.airDate}
                airStamp={episode.airStamp}
                episodeType={episode.episodeType}
                runtimeMin={episode.runtimeMin}
                watchCount={episode.watchCount}
                overview={episode.overview}
                stillRef={episode.stillRef}
                lastWatchedAt={episode.lastWatchedAt}
                myRating={episode.myRating}
                watched={episode.watchCount > 0}
                muted={!isEpisodeAired(episode)}
                checkboxDisabled={!isEpisodeAired(episode)}
                onToggleWatch={() => onToggleWatch(episode.id)}
                onWatchAgain={() => onWatchAgain(episode.id)}
                onEditDate={() => onEditDate(episode.id)}
                onBulkUpToHere={() => onBulkUpToHere(episode.id)}
                hasUnwatchedBefore={hasUnwatchedBefore}
                showRatingPrompt={promptEpisodeId === episode.id}
                onRate={(value) => onRateEpisode(episode.id, value)}
                onDismissPrompt={onDismissPrompt}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
