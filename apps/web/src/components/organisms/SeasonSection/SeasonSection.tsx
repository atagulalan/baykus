import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SeasonSummary } from "../../../api/types.ts";
import { isEpisodeAired } from "../../../lib/airing.ts";
import { AccordionPanel } from "../../atoms/Accordion/Accordion.tsx";
import { CircularProgress } from "../../atoms/CircularProgress/CircularProgress.tsx";
import { UnwatchSeasonDialog } from "../../dialogs/UnwatchSeasonDialog/UnwatchSeasonDialog.tsx";
import { SectionHeader } from "../../molecules/SectionHeader/SectionHeader.tsx";
import { EpisodeRow } from "../EpisodeRow/EpisodeRow.tsx";
import { SeasonActionsMenu } from "../SeasonActionsMenu/SeasonActionsMenu.tsx";

interface SeasonSectionProps {
  season: SeasonSummary;
  nextUnwatched: { s: number; e: number } | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  /** Fired after the collapse animation finishes. */
  onCloseComplete?: () => void;
  /** Fired after the expand animation finishes. */
  onOpenComplete?: () => void;
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

export function formatSeasonCount(watched: number, total: number, complete: boolean): string {
  if (watched === 0 || complete) return String(total);
  return `${watched}/${total}`;
}

export function SeasonSection({
  season,
  nextUnwatched,
  expanded,
  onToggleExpanded,
  onCloseComplete,
  onOpenComplete,
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
  const totalCount = season.episodes.length;
  const watchedAiredCount = airedEpisodes.filter((e) => e.watchCount > 0).length;
  const watchedCount = season.episodes.filter((e) => e.watchCount > 0).length;
  // Aired-only catch-up (E50 fill) vs season finished with no unaired left (E180).
  const caughtUpOnAired = airedCount > 0 && watchedAiredCount >= airedCount;
  const finished = caughtUpOnAired && airedCount === totalCount;
  const caughtUpWaiting = caughtUpOnAired && !finished;
  const progressPct = airedCount === 0 ? 0 : (watchedAiredCount / airedCount) * 100;
  const [showUnwatchDialog, setShowUnwatchDialog] = useState(false);
  const emptyAnnounced = totalCount === 0;

  const label =
    season.name ??
    (season.number === 0
      ? t("series.specials")
      : t("series.seasonNumber", { number: season.number }));

  const count = emptyAnnounced
    ? t("episode.tbd")
    : formatSeasonCount(watchedCount, totalCount, finished);

  return (
    <div
      className="flex flex-col scroll-mt-[var(--app-header-height,3.5rem)]"
      data-season-number={season.number}
    >
      <SectionHeader
        leading={
          <SeasonActionsMenu
            canMarkWatched={airedCount > 0 && !caughtUpOnAired}
            canUnwatch={watchedCount > 0}
            onMarkSeasonWatched={onMarkSeasonWatched}
            onUnwatchSeason={() => setShowUnwatchDialog(true)}
          >
            <CircularProgress value={progressPct} complete={finished} caughtUp={caughtUpWaiting} />
          </SeasonActionsMenu>
        }
        label={label}
        count={count}
        inset="list"
        onClick={onToggleExpanded}
        expanded={expanded}
      />
      {showUnwatchDialog && (
        <UnwatchSeasonDialog
          onClose={() => setShowUnwatchDialog(false)}
          onConfirm={() => onUnwatchSeason()}
        />
      )}
      <AccordionPanel
        open={expanded}
        unmountOnExit
        overflowVisibleWhenOpen={false}
        speed={1600}
        minDurationMs={180}
        maxDurationMs={520}
        // Soft bookends, blistering mid — ease-in-out quint S-curve.
        easing="easeInOutQuint"
        contentClassName="flex flex-col gap-0.5 pt-2"
        {...(onCloseComplete ? { onCloseComplete } : {})}
        {...(onOpenComplete ? { onOpenComplete } : {})}
      >
        {emptyAnnounced ? (
          <div
            className="list-inset flex min-h-28 flex-col items-center justify-center gap-2 px-3 pt-4 pb-10 text-center sm:px-0"
            data-slot="season-empty"
          >
            <p className="font-display italic text-lg tracking-tight text-snow/90">
              {t("series.seasonEmpty.title")}
            </p>
            <p className="font-mono text-xs text-muted/70">{t("series.seasonEmpty.hint")}</p>
          </div>
        ) : (
          season.episodes.map((episode) => {
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
          })
        )}
      </AccordionPanel>
    </div>
  );
}
