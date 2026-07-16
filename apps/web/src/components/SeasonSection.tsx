import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SeasonSummary } from "../api/types.ts";
import { todayIso } from "../lib/date.ts";
import { Checkbox } from "./Checkbox.tsx";
import { EpisodeRow } from "./EpisodeRow.tsx";

interface SeasonSectionProps {
  season: SeasonSummary;
  nextUnwatched: { s: number; e: number } | null;
  onToggleWatch: (episodeId: number) => void;
  onWatchAgain: (episodeId: number) => void;
  onEditDate: (episodeId: number) => void;
  onBulkUpToHere: (episodeId: number) => void;
  onMarkSeasonWatched: () => void;
  promptEpisodeId: number | null;
  onRateEpisode: (episodeId: number, value: 1 | 2 | 3) => void;
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
  promptEpisodeId,
  onRateEpisode,
  onDismissPrompt,
}: SeasonSectionProps) {
  const { t } = useTranslation();

  const today = todayIso();
  const airedCount = season.episodes.filter((e) => e.airDate !== null && e.airDate <= today).length;
  const watchedCount = season.episodes.filter((e) => e.watchCount > 0).length;
  const complete = airedCount > 0 && watchedCount >= airedCount;

  const [expanded, setExpanded] = useState(season.number !== 0 && !complete);

  const label =
    season.name ??
    (season.number === 0
      ? t("series.specials")
      : t("series.seasonNumber", { number: season.number }));

  return (
    <div className="border-white/10 border-b py-2">
      <div className="flex items-center gap-2 px-1 py-1">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left text-sm"
        >
          <span className="text-muted">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
          <span className="font-medium">{label}</span>
          <span className="text-xs text-muted">
            ({watchedCount}/{season.episodes.length})
          </span>
        </button>
        <div className="flex items-center gap-2 pr-2">
          <Checkbox
            checked={complete}
            disabled={complete || airedCount === 0}
            onChange={(checked) => {
              if (checked && !complete) onMarkSeasonWatched();
            }}
            aria-label={t("series.markSeasonWatched")}
          />
        </div>
      </div>
      {expanded && (
        <div className="flex flex-col gap-0.5">
          {season.episodes.map((episode) => {
            const hasUnwatchedBefore =
              nextUnwatched !== null &&
              (episode.s > nextUnwatched.s ||
                (episode.s === nextUnwatched.s && episode.e > nextUnwatched.e));
            return (
              <EpisodeRow
                key={episode.id}
                episode={episode}
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
      )}
    </div>
  );
}
