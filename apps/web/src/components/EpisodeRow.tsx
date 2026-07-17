import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { getSettings } from "../api/client.ts";
import type { EpisodeSummary } from "../api/types.ts";
import { todayIso } from "../lib/date.ts";
import { Checkbox } from "./Checkbox.tsx";
import { EpisodeLabel } from "./EpisodeLabel.tsx";
import { Modal } from "./Modal.tsx";
import { RatingControl } from "./RatingControl.tsx";

interface EpisodeRowProps {
  episode: EpisodeSummary;
  onToggleWatch: () => void;
  onWatchAgain: () => void;
  onEditDate: () => void;
  onBulkUpToHere: () => void;
  /** E47: is there an unwatched aired episode before this one in the season? Gates the "mark up to here" prompt. */
  hasUnwatchedBefore: boolean;
  /** E8: transient post-watch rating prompt, shown only after single-episode marking. */
  showRatingPrompt?: boolean;
  onRate?: (value: 1 | 2 | 3) => void;
  onDismissPrompt?: () => void;
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
  hasUnwatchedBefore,
  showRatingPrompt = false,
  onRate,
  onDismissPrompt,
}: EpisodeRowProps) {
  const { t } = useTranslation();
  const [showMarkUpToHereModal, setShowMarkUpToHereModal] = useState(false);
  const [showWatchedOptionsModal, setShowWatchedOptionsModal] = useState(false);
  const checkboxAnchorRef = useRef<HTMLDivElement>(null);
  const [promptPos, setPromptPos] = useState<{
    right: number;
    placement: "below" | "above";
    top?: number;
    bottom?: number;
  } | null>(null);

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const isAired = episode.airDate !== null && episode.airDate <= todayIso();
  const watched = episode.watchCount > 0;
  const hideSpoilers = (settings?.spoilerProtection ?? false) && !watched;

  useLayoutEffect(() => {
    if (!showRatingPrompt) {
      setPromptPos(null);
      return;
    }
    function update() {
      const el = checkboxAnchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const estimatedHeight = 44;
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const placement = spaceBelow < estimatedHeight ? "above" : "below";
      const right = window.innerWidth - rect.right;
      setPromptPos(
        placement === "below"
          ? { top: rect.bottom + gap, right, placement }
          : { bottom: window.innerHeight - rect.top + gap, right, placement },
      );
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [showRatingPrompt]);

  function handleCheckboxClick() {
    if (watched) {
      setShowWatchedOptionsModal(true);
    } else if (hasUnwatchedBefore) {
      setShowMarkUpToHereModal(true);
    } else {
      onToggleWatch();
    }
  }

  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center gap-4 border-white/5 border-b px-2 py-3 transition-colors hover:bg-white/5 sm:px-4 ${isAired ? "" : "opacity-50"}`}
      >
        <EpisodeLabel s={episode.s} e={episode.e} className="w-14 shrink-0 text-muted" />
        <span
          className={`flex-1 truncate font-display text-base text-snow italic ${hideSpoilers ? "blur-sm opacity-60" : ""}`}
        >
          {episode.title ?? t("episode.untitled")}
        </span>
        {episode.episodeType === "finale" && (
          <span className="shrink-0 border border-white/20 px-1.5 py-0.5 font-mono text-[9px] text-snow uppercase tracking-widest">
            {t("episode.finale")}
          </span>
        )}
        <span className="w-24 shrink-0 text-right font-mono text-[10px] text-muted/70">
          {formatAirDate(episode.airDate)}
        </span>
        {episode.runtimeMin != null && (
          <span className="w-12 shrink-0 text-right font-mono text-[10px] text-muted">
            {episode.runtimeMin}dk
          </span>
        )}
        {episode.watchCount > 1 && (
          <span className="shrink-0 font-mono text-xs text-yellow">×{episode.watchCount}</span>
        )}

        <div ref={checkboxAnchorRef} className="relative shrink-0">
          <Checkbox
            checked={watched}
            showHint
            disabled={!isAired}
            onChange={handleCheckboxClick}
            aria-label={t("episode.toggleWatched")}
          />
        </div>
      </div>
      {showRatingPrompt &&
        promptPos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={onDismissPrompt} aria-hidden="true" />
            <div
              role="dialog"
              aria-label={t("rating.label")}
              className={`fixed z-50 flex items-center gap-2 border border-white/10 bg-[#101010] p-2 shadow-2xl backdrop-blur-md ${
                promptPos.placement === "below" ? "animate-rating-pop" : "animate-rating-pop-up"
              }`}
              style={{
                top: promptPos.top,
                bottom: promptPos.bottom,
                right: promptPos.right,
              }}
            >
              <RatingControl
                value={episode.myRating}
                onChange={(value) => {
                  if (value !== null) onRate?.(value);
                }}
                size="sm"
              />
              <button
                type="button"
                onClick={onDismissPrompt}
                className="px-1.5 font-mono text-[10px] text-muted uppercase tracking-widest hover:text-snow"
              >
                {t("rating.skip")}
              </button>
            </div>
          </>,
          document.body,
        )}

      {showMarkUpToHereModal && (
        <Modal
          isOpen={showMarkUpToHereModal}
          onClose={() => setShowMarkUpToHereModal(false)}
          className="p-6 text-center"
        >
          <h2 className="mb-4 font-display text-lg text-snow italic">
            {t("episode.watchedUpToHereTitle")}
          </h2>
          <p className="mb-6 text-muted text-sm">{t("episode.watchedUpToHereDesc")}</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setShowMarkUpToHereModal(false);
                onBulkUpToHere();
              }}
              className="w-full bg-yellow px-4 py-2 font-mono text-[#080808] text-xs uppercase tracking-widest transition-opacity hover:opacity-90"
            >
              {t("episode.watchedUpToHere")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMarkUpToHereModal(false);
                onToggleWatch();
              }}
              className="w-full border border-white/10 px-4 py-2 font-mono text-snow text-xs uppercase tracking-widest transition-colors hover:bg-white/5"
            >
              {t("episode.markOnlyThis")}
            </button>
          </div>
        </Modal>
      )}

      {showWatchedOptionsModal && (
        <Modal
          isOpen={showWatchedOptionsModal}
          onClose={() => setShowWatchedOptionsModal(false)}
          className="!p-0 !overflow-hidden"
        >
          <button
            type="button"
            onClick={() => {
              setShowWatchedOptionsModal(false);
              onWatchAgain();
            }}
            className="block w-full border-white/5 border-b px-4 py-4 text-left font-mono text-muted text-sm transition-colors hover:bg-white/5 hover:text-snow"
          >
            {t("episode.watchAgain")}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowWatchedOptionsModal(false);
              onEditDate();
            }}
            className="block w-full border-white/5 border-b px-4 py-4 text-left font-mono text-muted text-sm transition-colors hover:bg-white/5 hover:text-snow"
          >
            {t("episode.editDate")}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowWatchedOptionsModal(false);
              onToggleWatch();
            }}
            className="block w-full px-4 py-4 text-left font-mono text-red-400 text-sm transition-colors hover:bg-white/5 hover:text-red-300"
          >
            {episode.watchCount > 1 ? t("episode.removeRewatch") : t("episode.markAsUnwatched")}
          </button>
        </Modal>
      )}
    </div>
  );
}
