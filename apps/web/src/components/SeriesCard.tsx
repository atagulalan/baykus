import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildImageUrl } from "../api/images.ts";
import type { ManualList, SeriesSummary } from "../api/types.ts";

interface SeriesCardProps {
  series: SeriesSummary;
  onRemove: () => void;
  onRefresh: () => void;
  onSetManualList: (manualList: ManualList | null) => void;
}

const RATING_EMOJI: Record<1 | 2 | 3, string> = { 1: "👎", 2: "😐", 3: "👍" };

export function SeriesCard({ series, onRemove, onRefresh, onSetManualList }: SeriesCardProps) {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = buildImageUrl(series.posterRef);
  const { watched, aired } = series.progress;
  const isFinished = series.category === "finished";
  const percent = aired > 0 ? Math.round((watched / aired) * 100) : 0;

  // Contextual manual-list actions — never offer the option already in effect,
  // and never offer "stopped" on a finished series (E20 guard mirrors the server 409).
  const canGoAuto = series.manualList !== null;
  const canGoWatchLater = series.manualList !== "watch_later";
  const canGoStopped = series.manualList !== "stopped" && !isFinished;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg bg-zinc-900">
      <Link to="/series/$id" params={{ id: String(series.id) }} className="contents">
        <div className="relative aspect-[2/3] w-full bg-zinc-800">
          {imageUrl && !imageFailed ? (
            <img
              src={imageUrl}
              alt={series.title}
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-2 text-center text-sm text-zinc-400">
              {series.title}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 p-2">
          <p className="truncate font-medium text-sm">{series.title}</p>
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{series.year ?? "—"}</span>
            {isFinished ? (
              <span className="text-emerald-400">✓</span>
            ) : (
              <span>
                {watched}/{aired}
              </span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </Link>
      {series.rating !== null && (
        <span className="absolute top-1 left-1 rounded bg-zinc-950/80 px-1 py-0.5 text-xs">
          {RATING_EMOJI[series.rating]}
        </span>
      )}
      <div className="absolute top-1 right-1 hidden gap-1 group-hover:flex">
        <button
          type="button"
          onClick={onRefresh}
          aria-label={t("library.card.refresh")}
          className="rounded bg-zinc-950/80 px-1.5 py-0.5 text-xs text-zinc-100"
        >
          ⟳
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded bg-zinc-950/80 px-1.5 py-0.5 text-xs text-zinc-100"
        >
          {t("library.card.remove")}
        </button>
      </div>
      <div className="absolute right-1 bottom-1 left-1 hidden flex-wrap justify-end gap-1 group-hover:flex">
        {canGoWatchLater && (
          <button
            type="button"
            onClick={() => onSetManualList("watch_later")}
            className="rounded bg-zinc-950/80 px-1.5 py-0.5 text-xs text-zinc-100"
          >
            {t("library.card.moveToWatchLater")}
          </button>
        )}
        {canGoStopped && (
          <button
            type="button"
            onClick={() => onSetManualList("stopped")}
            className="rounded bg-zinc-950/80 px-1.5 py-0.5 text-xs text-zinc-100"
          >
            {t("library.card.moveToStopped")}
          </button>
        )}
        {canGoAuto && (
          <button
            type="button"
            onClick={() => onSetManualList(null)}
            className="rounded bg-zinc-950/80 px-1.5 py-0.5 text-xs text-zinc-100"
          >
            {t("library.card.moveToAuto")}
          </button>
        )}
      </div>
    </div>
  );
}
