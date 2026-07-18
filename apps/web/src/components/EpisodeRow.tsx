import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSeriesByParam, getSettings } from "../api/client.ts";
import { buildImageUrl } from "../api/images.ts";
import type { EpisodeType } from "../api/types.ts";
import { dayUnitLabel, formatAirDateLabel, unairedTrailingState } from "../lib/airDateLabel.ts";
import { Checkbox } from "./Checkbox.tsx";
import { EpisodeDetailsModal } from "./EpisodeDetailsModal.tsx";
import { EpisodeLabel } from "./EpisodeLabel.tsx";
import { type EpisodeTagKind, EpisodeTags } from "./EpisodeTags.tsx";
import { MediaImage } from "./MediaImage.tsx";
import { Modal } from "./Modal.tsx";
import { RatingControl } from "./RatingControl.tsx";

export type EpisodeRowDensity = "comfortable" | "compact";

export interface EpisodeRowProps {
  s: number;
  e: number;
  episodeTitle: string | null;
  airDate: string | null;
  episodeType: EpisodeType | null;

  /** Series chrome — poster + linked series title when `itemId` + `seriesTitle` are set. */
  itemId?: number;
  seriesTitle?: string;
  posterRef?: string | null;

  /** Padding/scale. Compact for calendar rails; comfortable for season + watch. */
  density?: EpisodeRowDensity;

  overflow?: number;
  /** Passed through to the details modal when known. */
  runtimeMin?: number | null;
  watchCount?: number;
  seasonName?: string | null;
  excludeTags?: EpisodeTagKind[];
  /** Default: true with series chrome, false in season list (finale badge instead). */
  showTags?: boolean;

  /** Dim content (watched calendar row / unaired season episode). */
  muted?: boolean;

  /** Season-list text alignment. Center used by the detail next-up rail. */
  align?: "start" | "center";

  trailing?: ReactNode;
  /** E137: view-transition name for quick-mark fly animation. */
  transitionName?: string;

  watched?: boolean;
  onToggleWatch?: () => void;
  checkboxDisabled?: boolean;
  /** Hide the inline checkbox but keep the details-modal watch actions (detail next-up rail). */
  hideCheckbox?: boolean;
  /** Default true when a checkbox is shown. */
  showHint?: boolean;

  /** Season-detail checkbox sophistication (E8 / E47). */
  onWatchAgain?: () => void;
  onEditDate?: () => void;
  onBulkUpToHere?: () => void;
  hasUnwatchedBefore?: boolean;
  showRatingPrompt?: boolean;
  myRating?: 1 | 2 | 3 | null;
  onRate?: (value: 1 | 2 | 3 | null) => void;
  onDismissPrompt?: () => void;

  /** Details modal fields — omit / pass undefined overview while a fetch is pending. */
  overview?: string | null;
  stillRef?: string | null;
  lastWatchedAt?: string | null;
  networkOrProvider?: string | null;
  /**
   * When set with `itemId`, opening details fetches series detail to fill
   * still/overview (calendar entries lack those fields).
   */
  detailsEpisodeId?: number;
}

function setPosterTransition(itemId: number, poster: HTMLElement | null) {
  document.querySelectorAll(`[style*="view-transition-name: poster-${itemId}"]`).forEach((el) => {
    (el as HTMLElement).style.viewTransitionName = "";
  });
  if (poster) {
    poster.style.viewTransitionName = `poster-${itemId}`;
  }
}

/**
 * Unified episode list row — season detail, calendar timeline, and watch page.
 * Same visual language at every density: display italic primary, mono meta, border hover.
 */
export function EpisodeRow({
  s,
  e,
  episodeTitle,
  airDate,
  episodeType,
  itemId,
  seriesTitle,
  posterRef = null,
  density = "comfortable",
  overflow = 0,
  runtimeMin = null,
  watchCount = 0,
  seasonName,
  excludeTags,
  showTags,
  muted = false,
  align = "start",
  trailing,
  transitionName,
  watched = false,
  onToggleWatch,
  checkboxDisabled = false,
  hideCheckbox = false,
  showHint = true,
  onWatchAgain,
  onEditDate,
  onBulkUpToHere,
  hasUnwatchedBefore = false,
  showRatingPrompt = false,
  myRating = null,
  onRate,
  onDismissPrompt,
  overview: overviewProp,
  stillRef: stillRefProp = null,
  lastWatchedAt: lastWatchedAtProp = null,
  networkOrProvider,
  detailsEpisodeId,
}: EpisodeRowProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMarkUpToHereModal, setShowMarkUpToHereModal] = useState(false);
  const [showWatchedOptionsModal, setShowWatchedOptionsModal] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const promptAnchorRef = useRef<HTMLDivElement>(null);
  const posterLinkRef = useRef<HTMLAnchorElement>(null);

  const hasSeriesChrome = itemId != null && seriesTitle != null;
  const tagsVisible = showTags ?? hasSeriesChrome;
  const hideSpoilers = (settings?.spoilerProtection ?? false) && !watched;
  const compact = density === "compact";
  const seriesParam = itemId != null ? `i${itemId}` : null;
  const imageUrl = buildImageUrl(posterRef);

  const shouldFetchDetails =
    showDetailsModal && itemId != null && detailsEpisodeId != null && seriesParam != null;
  const { data: series } = useQuery({
    queryKey: ["series", seriesParam],
    queryFn: () => getSeriesByParam(seriesParam as string),
    enabled: shouldFetchDetails,
  });
  const fetchedEpisode = series?.seasons
    .flatMap((season) => season.episodes)
    .find((ep) => ep.id === detailsEpisodeId);

  const overview =
    detailsEpisodeId != null
      ? series == null
        ? undefined
        : (fetchedEpisode?.overview ?? null)
      : (overviewProp ?? null);
  const stillRef = fetchedEpisode?.stillRef ?? stillRefProp;
  const detailRuntime = fetchedEpisode?.runtimeMin ?? runtimeMin;
  const detailWatchCount = fetchedEpisode?.watchCount ?? watchCount;
  const detailLastWatched = fetchedEpisode?.lastWatchedAt ?? lastWatchedAtProp;
  const detailTitle = fetchedEpisode?.title ?? episodeTitle;
  const detailAirDate = fetchedEpisode?.airDate ?? airDate;
  const detailType = fetchedEpisode?.episodeType ?? episodeType;
  const stillImageUrl = buildImageUrl(stillRef, "thumb");

  useEffect(() => {
    if (!showRatingPrompt || !onDismissPrompt) return;
    function handlePointerDown(event: PointerEvent) {
      const el = promptAnchorRef.current;
      if (!el || !(event.target instanceof Node) || el.contains(event.target)) return;
      onDismissPrompt?.();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showRatingPrompt, onDismissPrompt]);

  function prefetchSeries() {
    if (!seriesParam) return;
    queryClient.prefetchQuery({
      queryKey: ["series", seriesParam],
      queryFn: () => getSeriesByParam(seriesParam),
    });
  }

  function handleCheckboxClick() {
    if (!onToggleWatch) return;
    if (watched && onWatchAgain && onEditDate) {
      setShowWatchedOptionsModal(true);
    } else if (!watched && hasUnwatchedBefore && onBulkUpToHere) {
      setShowMarkUpToHereModal(true);
    } else {
      onToggleWatch();
    }
  }

  const centered = align === "center";
  const shellClass = [
    "flex min-w-0 items-center border-white/5 border-b transition-colors hover:bg-white/5",
    // Same horizontal padding at every density so the trailing checkbox column lines up.
    compact ? "gap-2 py-1.5 text-sm" : "gap-3 py-3 sm:gap-4",
    "px-2 sm:px-4",
    centered ? "justify-center" : "",
    muted ? "opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const primaryClass = `min-w-0 truncate font-display italic text-snow ${
    compact ? "text-sm" : "text-base"
  } ${centered ? "text-center" : ""} ${
    hideSpoilers && !hasSeriesChrome ? "blur-sm opacity-60" : ""
  }`;

  const rewatched = watchCount > 1;
  const trailingState = unairedTrailingState(airDate);
  // Unaired marks only for unwatched rows — watched rows keep rewatch controls.
  const showUnairedMark = !watched && trailingState.kind !== "none";
  const unairedMark =
    showUnairedMark && trailingState.kind === "countdown" ? (
      <div className="flex min-w-5 shrink-0 flex-col items-center justify-center leading-none">
        <span className="font-mono text-base text-snow/80 tabular-nums">{trailingState.days}</span>
        <span className="mt-0.5 font-mono text-[9px] text-muted">
          {dayUnitLabel(trailingState.days, i18n.language)}
        </span>
      </div>
    ) : showUnairedMark && trailingState.kind === "tbd" ? (
      <span className="shrink-0 font-mono text-[10px] text-muted uppercase tracking-widest">
        {t("episode.tbd")}
      </span>
    ) : null;
  const checkbox =
    showUnairedMark || hideCheckbox ? null : onToggleWatch ? (
      // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation only
      // biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation only
      <div
        ref={promptAnchorRef}
        className="relative flex h-5 min-w-5 shrink-0 items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {showRatingPrompt && (
          <div
            role="dialog"
            aria-label={t("rating.label")}
            className="absolute top-0 bottom-0 right-full z-10 mr-2 flex items-center animate-rating-slide-left"
          >
            <div className="flex items-center gap-2 border border-white/10 bg-[#101010] p-2 shadow-2xl">
              <RatingControl
                value={myRating}
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
          </div>
        )}
        {rewatched ? (
          <button
            type="button"
            disabled={checkboxDisabled}
            onClick={handleCheckboxClick}
            aria-label={t("episode.watchedCount", { count: watchCount })}
            className={`flex h-5 min-w-5 shrink-0 items-center justify-center px-0.5 font-mono text-xs text-yellow tabular-nums transition-opacity ${
              checkboxDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:opacity-80"
            }`}
          >
            ×{watchCount}
          </button>
        ) : (
          <Checkbox
            checked={watched}
            showHint={showHint}
            disabled={checkboxDisabled}
            onChange={handleCheckboxClick}
            aria-label={t("episode.toggleWatched")}
          />
        )}
      </div>
    ) : null;

  const poster = hasSeriesChrome && seriesParam && (
    <Link
      ref={posterLinkRef}
      to="/series/$id"
      params={{ id: seriesParam }}
      className="js-poster h-12 w-8 shrink-0 overflow-hidden bg-white/5"
      onClick={(e) => {
        e.stopPropagation();
        setPosterTransition(itemId, e.currentTarget);
      }}
      onMouseEnter={prefetchSeries}
    >
      {imageUrl && !imageFailed && (
        <MediaImage
          src={imageUrl}
          alt=""
          wrapperClassName="block h-full w-full"
          className="h-full w-full object-cover opacity-90"
          spinnerSize={12}
          onError={() => setImageFailed(true)}
        />
      )}
    </Link>
  );

  const episodeThumbnail = !hasSeriesChrome && !hideSpoilers && stillImageUrl && !imageFailed && (
    <MediaImage
      src={stillImageUrl}
      alt=""
      wrapperClassName="block h-12 w-20 shrink-0 bg-white/5"
      className="h-full w-full object-cover opacity-90"
      spinnerSize={12}
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );

  const seriesTitleLink = hasSeriesChrome && seriesParam && (
    <Link
      to="/series/$id"
      params={{ id: seriesParam }}
      className={`${primaryClass} w-auto max-w-full self-start hover:text-yellow ${
        muted ? "text-muted" : ""
      }`}
      onClick={(e) => {
        e.stopPropagation();
        setPosterTransition(itemId, posterLinkRef.current);
      }}
      onMouseEnter={prefetchSeries}
    >
      {seriesTitle}
    </Link>
  );

  const metaRow = (
    <div className={`flex min-w-0 items-center ${compact ? "gap-1.5" : "gap-2"}`}>
      <span className="shrink-0 font-mono text-xs text-muted">
        <EpisodeLabel s={s} e={e} />
        {overflow > 0 && <span className="ml-1 opacity-50">+{overflow}</span>}
      </span>
      {episodeTitle && hasSeriesChrome && (
        <>
          {compact && <span className="opacity-50 text-muted">{t("common.separator")}</span>}
          <span
            className={`truncate font-mono text-xs text-muted/70 ${hideSpoilers ? "blur-sm" : ""}`}
          >
            {episodeTitle}
          </span>
        </>
      )}
      {tagsVisible && (
        <EpisodeTags
          s={s}
          e={e}
          airDate={airDate}
          episodeType={episodeType}
          episodeTitle={episodeTitle}
          {...(seasonName !== undefined ? { seasonName } : {})}
          {...(excludeTags ? { excludeTags } : {})}
        />
      )}
    </div>
  );

  const seasonPrimary = (
    <div
      className={`flex min-w-0 items-center gap-2 sm:gap-4 ${
        centered ? "flex-col justify-center text-center" : "flex-1"
      }`}
    >
      <div className={`min-w-0 overflow-hidden ${centered ? "" : "flex-1"}`}>
        <div className={primaryClass}>{episodeTitle ?? t("episode.untitled")}</div>
        <div
          className={`mt-0.5 truncate font-mono text-xs text-muted ${
            centered ? "text-center" : ""
          }`}
        >
          <EpisodeLabel s={s} e={e} />
          {airDate && (
            <>
              <span className="text-muted/50"> – </span>
              <span className="tabular-nums text-snow/70">
                {formatAirDateLabel(airDate, i18n.language)}
              </span>
            </>
          )}
        </div>
      </div>
      {episodeType === "finale" && (
        <span className="shrink-0 border border-white/20 px-1.5 py-0.5 font-mono text-[9px] text-snow uppercase tracking-widest">
          {t("episode.finale")}
        </span>
      )}
      {centered && tagsVisible && (
        <EpisodeTags
          s={s}
          e={e}
          airDate={airDate}
          episodeType={episodeType}
          episodeTitle={episodeTitle}
          {...(seasonName !== undefined ? { seasonName } : {})}
          {...(excludeTags ? { excludeTags } : {})}
        />
      )}
    </div>
  );

  const seriesPrimary = (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden">
      {seriesTitleLink}
      {metaRow}
    </div>
  );

  const body = hasSeriesChrome ? (
    <>
      {poster}
      {seriesPrimary}
    </>
  ) : (
    <>
      {episodeThumbnail}
      {seasonPrimary}
    </>
  );

  return (
    <div
      className="episode-row flex min-w-0 flex-col"
      style={transitionName ? { viewTransitionName: transitionName } : undefined}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: row opens details; links handle series nav */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: list row */}
      <div
        className={`${shellClass} episode-row-shell cursor-pointer`}
        onClick={() => setShowDetailsModal(true)}
        onMouseEnter={hasSeriesChrome ? prefetchSeries : undefined}
      >
        {body}
        {tagsVisible && !hasSeriesChrome && !centered && (
          <EpisodeTags
            s={s}
            e={e}
            airDate={airDate}
            episodeType={episodeType}
            episodeTitle={episodeTitle}
            {...(seasonName !== undefined ? { seasonName } : {})}
            {...(excludeTags ? { excludeTags } : {})}
          />
        )}
        {trailing != null && (
          <div className="flex h-5 shrink-0 items-center justify-center">{trailing}</div>
        )}
        {unairedMark}
        {checkbox}
      </div>

      {showMarkUpToHereModal && onBulkUpToHere && onToggleWatch && (
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

      {showWatchedOptionsModal && onWatchAgain && onEditDate && onToggleWatch && (
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
            {watchCount > 1 ? t("episode.removeRewatch") : t("episode.markAsUnwatched")}
          </button>
        </Modal>
      )}

      <EpisodeDetailsModal
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        s={s}
        e={e}
        episodeTitle={detailTitle}
        airDate={detailAirDate}
        episodeType={detailType}
        overview={overview}
        runtimeMin={detailRuntime}
        watchCount={detailWatchCount}
        lastWatchedAt={detailLastWatched}
        stillRef={stillRef}
        hideSpoilers={hideSpoilers}
        {...(seriesTitle !== undefined ? { seriesTitle } : {})}
        {...(seasonName !== undefined ? { seasonName } : {})}
        {...(networkOrProvider ? { networkOrProvider } : {})}
        {...(itemId != null ? { itemId } : {})}
        watched={watched}
        myRating={myRating}
        {...(onRate ? { onRate } : {})}
        {...(onToggleWatch
          ? {
              onToggleWatched: onToggleWatch,
              toggleDisabled: checkboxDisabled,
            }
          : {})}
      />
    </div>
  );
}
