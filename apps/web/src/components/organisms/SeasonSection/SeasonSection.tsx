import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SeasonSummary } from "../../../api/types.ts";
import { todayIso } from "../../../lib/date.ts";
import { Checkbox } from "../../atoms/Checkbox/Checkbox.tsx";
import { EpisodeRow } from "../EpisodeRow/EpisodeRow.tsx";
import { UnwatchSeasonDialog } from "../../dialogs/UnwatchSeasonDialog/UnwatchSeasonDialog.tsx";

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

  const today = todayIso();
  const airedEpisodes = season.episodes.filter((e) => e.airDate !== null && e.airDate <= today);
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
  const [fillPct, setFillPct] = useState(0);
  const fillAnimated = useRef(false);

  useEffect(() => {
    if (!expanded) {
      fillAnimated.current = false;
      setFillPct(0);
      return;
    }

    if (!fillAnimated.current) {
      fillAnimated.current = true;
      setFillPct(0);
      const id = requestAnimationFrame(() => {
        setFillPct(progressPct);
      });
      return () => cancelAnimationFrame(id);
    }

    setFillPct(progressPct);
  }, [expanded, progressPct]);

  const label =
    season.name ??
    (season.number === 0
      ? t("series.specials")
      : t("series.seasonNumber", { number: season.number }));

  return (
    <div className="season-section flex flex-col">
      <div className="flex flex-col">
        <div className="flex list-inset">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex flex-1 items-center gap-2 text-left text-sm py-5"
          >
            <span className="text-muted">
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
            <span className="font-medium">{label}</span>
            <span className="ml-auto font-mono text-xs tabular-nums text-muted">
              {watchedCount}/{season.episodes.length}
            </span>
          </button>
          <div className="flex items-center py-5 pl-3 sm:pl-4">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              <Checkbox
                checked={complete}
                showHint
                disabled={airedCount === 0}
                onChange={(checked) => {
                  if (checked && !complete) {
                    onMarkSeasonWatched();
                  } else if (!checked && complete) {
                    if (watchedCount > 1) {
                      setShowUnwatchDialog(true);
                    } else {
                      onUnwatchSeason();
                    }
                  }
                }}
                aria-label={t("series.markSeasonWatched")}
              />
            </div>
          </div>
        </div>
        {expanded ? (
          <div
            role="progressbar"
            aria-valuenow={watchedAiredCount}
            aria-valuemin={0}
            aria-valuemax={Math.max(airedCount, 1)}
            aria-label={label}
            className="season-section-divider h-px w-full bg-white/5"
          >
            <div
              className="season-section-progress-fill h-full bg-yellow transition-[width] duration-300 ease-out"
              style={{ width: `${fillPct}%` }}
            />
          </div>
        ) : (
          <div className="season-section-divider h-px w-full bg-white/5" />
        )}
      </div>
      {showUnwatchDialog && (
        <UnwatchSeasonDialog
          onClose={() => setShowUnwatchDialog(false)}
          onConfirm={() => onUnwatchSeason()}
        />
      )}
      <div data-expanded={expanded} className="season-episodes">
        <div className="flex flex-col gap-0.5">
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
                episodeType={episode.episodeType}
                runtimeMin={episode.runtimeMin}
                watchCount={episode.watchCount}
                overview={episode.overview}
                stillRef={episode.stillRef}
                lastWatchedAt={episode.lastWatchedAt}
                myRating={episode.myRating}
                watched={episode.watchCount > 0}
                muted={episode.airDate === null || episode.airDate > todayIso()}
                checkboxDisabled={episode.airDate === null || episode.airDate > todayIso()}
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
