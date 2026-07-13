import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SeasonSummary } from "../api/types.ts";
import { EpisodeRow } from "./EpisodeRow.tsx";

interface SeasonSectionProps {
  season: SeasonSummary;
  onToggleWatch: (episodeId: number) => void;
  onWatchAgain: (episodeId: number) => void;
  onEditDate: (episodeId: number) => void;
  onBulkUpToHere: (episodeId: number) => void;
  onMarkSeasonWatched: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SeasonSection({
  season,
  onToggleWatch,
  onWatchAgain,
  onEditDate,
  onBulkUpToHere,
  onMarkSeasonWatched,
}: SeasonSectionProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(season.number !== 0);

  const today = todayIso();
  const airedCount = season.episodes.filter((e) => e.airDate !== null && e.airDate <= today).length;
  const watchedCount = season.episodes.filter((e) => e.watchCount > 0).length;
  const label =
    season.name ??
    (season.number === 0
      ? t("series.specials")
      : t("series.seasonNumber", { number: season.number }));
  const complete = airedCount > 0 && watchedCount >= airedCount;

  return (
    <div className="border-zinc-800 border-b py-2">
      <div className="flex items-center gap-2 px-1 py-1">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left text-sm"
        >
          <span className="text-zinc-500">{expanded ? "▾" : "▸"}</span>
          <span className="font-medium">{label}</span>
          <span className="text-xs text-zinc-500">
            ({watchedCount}/{season.episodes.length}){complete ? " ✓" : ""}
          </span>
        </button>
        <button
          type="button"
          onClick={onMarkSeasonWatched}
          className="shrink-0 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
        >
          {t("series.markSeasonWatched")}
        </button>
      </div>
      {expanded && (
        <div className="flex flex-col gap-0.5">
          {season.episodes.map((episode) => (
            <EpisodeRow
              key={episode.id}
              episode={episode}
              onToggleWatch={() => onToggleWatch(episode.id)}
              onWatchAgain={() => onWatchAgain(episode.id)}
              onEditDate={() => onEditDate(episode.id)}
              onBulkUpToHere={() => onBulkUpToHere(episode.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
