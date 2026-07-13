import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EpisodeSummary } from "../api/types.ts";

interface EpisodeRowProps {
  episode: EpisodeSummary;
  onToggleWatch: () => void;
  onWatchAgain: () => void;
  onEditDate: () => void;
  onBulkUpToHere: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatAirDate(airDate: string | null): string {
  if (!airDate) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${airDate}T00:00:00Z`));
}

export function EpisodeRow({
  episode,
  onToggleWatch,
  onWatchAgain,
  onEditDate,
  onBulkUpToHere,
}: EpisodeRowProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  const isAired = episode.airDate !== null && episode.airDate <= todayIso();
  const watched = episode.watchCount > 0;

  return (
    <div
      className={`flex items-center gap-3 rounded px-2 py-1.5 text-sm ${isAired ? "" : "opacity-50"}`}
    >
      <input
        type="checkbox"
        checked={watched}
        disabled={!isAired}
        onChange={onToggleWatch}
        aria-label={t("episode.toggleWatched")}
        className="h-4 w-4 shrink-0 accent-emerald-500"
      />
      <span className="w-14 shrink-0 text-zinc-400 tabular-nums">
        S{episode.s}E{episode.e}
      </span>
      <span className="flex-1 truncate">{episode.title ?? t("episode.untitled")}</span>
      {episode.episodeType === "finale" && (
        <span className="shrink-0 rounded bg-red-900 px-1.5 py-0.5 font-semibold text-[10px] text-red-100">
          {t("episode.finale")}
        </span>
      )}
      <span className="w-24 shrink-0 text-right text-xs text-zinc-400">
        {formatAirDate(episode.airDate)}
      </span>
      {episode.runtimeMin != null && (
        <span className="w-12 shrink-0 text-right text-xs text-zinc-500">
          {episode.runtimeMin}dk
        </span>
      )}
      {episode.watchCount > 1 && (
        <span className="shrink-0 text-emerald-400 text-xs">×{episode.watchCount}</span>
      )}
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={t("episode.menu")}
          className="rounded px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          ⋮
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onWatchAgain();
              }}
              className="block w-full px-3 py-2 text-left text-xs hover:bg-zinc-800"
            >
              {t("episode.watchAgain")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEditDate();
              }}
              className="block w-full px-3 py-2 text-left text-xs hover:bg-zinc-800"
            >
              {t("episode.editDate")}
            </button>
            <button
              type="button"
              disabled={!isAired}
              onClick={() => {
                setMenuOpen(false);
                onBulkUpToHere();
              }}
              className="block w-full px-3 py-2 text-left text-xs hover:bg-zinc-800 disabled:opacity-50"
            >
              {t("episode.watchedUpToHere")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
