import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import { getSeriesByParam, getSettings } from "../../../api/client.ts";
import { buildImageUrl } from "../../../api/images.ts";
import type { EpisodeType } from "../../../api/types.ts";
import { formatAirDateLabel, unairedTrailingState } from "../../../lib/airDateLabel.ts";
import {
  countdownDayUnit,
  countdownHourUnit,
  countdownMinuteUnit,
  countdownSecondUnit,
} from "../../../lib/countdownUnit.ts";
import { todayIso } from "../../../lib/date.ts";
import { pageViewTransition } from "../../../lib/pageViewTransition.ts";
import {
  posterMorphStyle,
  setLastPosterItemId,
  useLastPosterItemId,
} from "../../../lib/posterTransition.ts";
import { seriesParam as seriesPathParam } from "../../../lib/seriesPath.ts";
import { useAiringClock } from "../../../lib/useAiringClock.ts";
import { Checkbox } from "../../atoms/Checkbox/Checkbox.tsx";
import { EpisodeLabel } from "../../atoms/EpisodeLabel/EpisodeLabel.tsx";
import { MediaImage } from "../../atoms/MediaImage/MediaImage.tsx";
import { RatingControl } from "../../atoms/RatingControl/RatingControl.tsx";
import { EpisodeDetailsModal } from "../../dialogs/EpisodeDetailsModal/EpisodeDetailsModal.tsx";
import { type EpisodeTagKind, EpisodeTags } from "../../molecules/EpisodeTags/EpisodeTags.tsx";
import { EpisodeRowWatchModals } from "./EpisodeRowWatchModals.tsx";
import { useEpisodeRowDetailsFetch } from "./useEpisodeRowDetailsFetch.ts";

export type EpisodeRowDensity = "comfortable" | "compact";

export interface EpisodeRowProps {
  s: number;
  e: number;
  episodeTitle: string | null;
  airDate: string | null;
  airStamp?: string | null;
  episodeType: EpisodeType | null;

  /** Series chrome — poster + linked series title when `itemId` + `seriesTitle` are set. */
  itemId?: number;
  /** E52: when set, links use the TMDB-parity URL (avoids a post-load canonical replace). */
  tmdbId?: number | null;
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
  /** Inside a pill/card shell (NextUpCard) — drop the list-row bottom border. */
  embedded?: boolean;
  /** Card rail — poster spans row height, flush on the leading edge (WatchNextRow). */
  posterStretch?: boolean;
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

/**
 * Unified episode list row — season detail, calendar timeline, and watch page.
 * Same visual language at every density: display italic primary, mono meta, border hover.
 */
export function EpisodeRow({
  s,
  e,
  episodeTitle,
  airDate,
  airStamp = null,
  episodeType,
  itemId,
  tmdbId = null,
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
  embedded = false,
  posterStretch = false,
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
  const episodeLabelFormat = settings?.episodeLabelFormat ?? "SxEy";

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  /** E205 — watch from details already has RatingControl; suppress row prompt. */
  const [suppressDetailsWatchPrompt, setSuppressDetailsWatchPrompt] = useState(false);
  const [showMarkUpToHereModal, setShowMarkUpToHereModal] = useState(false);
  const [showWatchedOptionsModal, setShowWatchedOptionsModal] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const lastPosterId = useLastPosterItemId();
  const posterTransition = itemId != null && lastPosterId === itemId;
  const promptAnchorRef = useRef<HTMLDivElement>(null);
  const posterLinkRef = useRef<HTMLAnchorElement>(null);

  function armPosterTransition() {
    if (itemId == null) return;
    flushSync(() => setLastPosterItemId(itemId));
  }

  const hasSeriesChrome = itemId != null && seriesTitle != null;
  const tagsVisible = showTags ?? hasSeriesChrome;
  const hideSpoilers = (settings?.spoilerProtection ?? false) && !watched;
  const compact = density === "compact";
  const seriesRouteParam =
    itemId != null ? seriesPathParam({ id: itemId, tmdbId: tmdbId ?? null }) : null;
  const imageUrl = buildImageUrl(posterRef);

  const {
    overview,
    stillRef,
    detailRuntime,
    detailWatchCount,
    detailLastWatched,
    detailTitle,
    detailAirDate,
    detailType,
    stillImageUrl,
  } = useEpisodeRowDetailsFetch({
    showDetailsModal,
    itemId,
    detailsEpisodeId,
    overviewProp,
    stillRefProp,
    runtimeMin,
    watchCount,
    lastWatchedAtProp,
    episodeTitle,
    airDate,
    episodeType,
  });

  useEffect(() => {
    if (!suppressDetailsWatchPrompt) return;
    if (showRatingPrompt) {
      onDismissPrompt?.();
      setSuppressDetailsWatchPrompt(false);
      return;
    }
    // Clear stale suppress if no prompt arrives (unwatch / error / already rated).
    const id = window.setTimeout(() => setSuppressDetailsWatchPrompt(false), 3000);
    return () => clearTimeout(id);
  }, [suppressDetailsWatchPrompt, showRatingPrompt, onDismissPrompt]);

  useEffect(() => {
    if (!showRatingPrompt || !onDismissPrompt || suppressDetailsWatchPrompt) return;
    function handlePointerDown(event: PointerEvent) {
      const el = promptAnchorRef.current;
      if (!el || !(event.target instanceof Node) || el.contains(event.target)) return;
      onDismissPrompt?.();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showRatingPrompt, onDismissPrompt, suppressDetailsWatchPrompt]);

  function closeDetailsModal() {
    setShowDetailsModal(false);
    // Keep suppressDetailsWatchPrompt so a late watch onSuccess still skips the popup.
    if (showRatingPrompt) onDismissPrompt?.();
  }

  function toggleWatchFromDetails() {
    if (!onToggleWatch) return;
    // Only first-watch would open the row prompt (E150); block it here.
    if (!watched) setSuppressDetailsWatchPrompt(true);
    onToggleWatch();
  }

  function prefetchSeries() {
    if (!seriesRouteParam) return;
    queryClient.prefetchQuery({
      queryKey: ["series", seriesRouteParam],
      queryFn: () => getSeriesByParam(seriesRouteParam),
    });
  }

  function handleCheckboxClick(event?: Pick<MouseEvent, "shiftKey">) {
    if (!onToggleWatch) return;
    // Shift+click skips confirm sheets: watched → unwatch; unwatched → mark only this.
    if (event?.shiftKey) {
      onToggleWatch();
      return;
    }
    if (watched && onWatchAgain && onEditDate) {
      setShowWatchedOptionsModal(true);
    } else if (!watched && hasUnwatchedBefore && onBulkUpToHere) {
      setShowMarkUpToHereModal(true);
    } else {
      onToggleWatch();
    }
  }

  function openDetails() {
    setShowDetailsModal(true);
  }

  function openDetailsFromShell(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('a, button, [role="checkbox"], [role="dialog"]')) return;
    openDetails();
  }

  const centered = align === "center";
  const episodeDisplayTitle = episodeTitle ?? t("episode.untitled");
  const stretchPoster = posterStretch && hasSeriesChrome;
  const shellClass = [
    "flex min-w-0 transition-colors",
    stretchPoster
      ? "items-stretch gap-0 rounded-md pl-3 pr-3 py-2 hover:bg-white/[0.04]"
      : "items-center",
    embedded ? "" : "border-white/5 border-b hover:bg-white/5",
    stretchPoster
      ? ""
      : compact
        ? "list-inset gap-2 py-1.5 text-sm"
        : "list-inset gap-3 py-3 sm:gap-4",
    centered ? "justify-center" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const stretchContentClass = compact
    ? `flex min-w-0 flex-1 items-center gap-2 py-1.5 ${stretchPoster ? "pl-2 pr-0" : "pl-4 pr-2"} text-sm ${stretchPoster ? "" : "sm:pr-4"}`
    : `flex min-w-0 flex-1 items-center gap-3 ${stretchPoster ? "py-2 pl-2 pr-0" : "py-3 pl-4 pr-2"} sm:gap-4 ${stretchPoster ? "" : "sm:pr-4"}`;

  const primaryClass = `min-w-0 truncate font-display italic ${
    muted ? "text-muted-dim" : "text-snow"
  } ${compact ? "text-sm" : "text-base"} ${centered ? "text-center" : ""} ${
    hideSpoilers && !hasSeriesChrome ? "blur-sm opacity-60" : ""
  }`;

  const rewatched = watchCount > 1;
  const needsAiringClock =
    !watched && (airStamp != null || (airDate != null && airDate > todayIso()));
  const now = useAiringClock(airDate, airStamp, needsAiringClock);
  const trailingState = unairedTrailingState(airDate, undefined, airStamp, now);
  // Unaired marks only for unwatched rows — watched rows keep rewatch controls.
  const showUnairedMark = !watched && trailingState.kind !== "none";
  const unairedMark =
    showUnairedMark && trailingState.kind === "countdown" ? (
      <div className="flex min-w-5 shrink-0 flex-col items-center justify-center leading-none">
        <span className="font-mono text-base text-snow/80 tabular-nums">{trailingState.days}</span>
        <span className="mt-0.5 font-mono text-[9px] text-muted">
          {countdownDayUnit(trailingState.days, t)}
        </span>
      </div>
    ) : showUnairedMark && trailingState.kind === "countdownClock" ? (
      <div className="flex min-w-5 shrink-0 flex-col items-center justify-center leading-none">
        <span className="font-mono text-base text-snow/80 tabular-nums">{trailingState.hours}</span>
        <span className="mt-0.5 font-mono text-[9px] text-muted">
          {countdownHourUnit(trailingState.hours, t)}
        </span>
      </div>
    ) : showUnairedMark && trailingState.kind === "countdownMinutes" ? (
      <div className="flex min-w-5 shrink-0 flex-col items-center justify-center leading-none">
        <span className="font-mono text-base text-snow/80 tabular-nums">
          {trailingState.minutes}
        </span>
        <span className="mt-0.5 font-mono text-[9px] text-muted">{countdownMinuteUnit(t)}</span>
      </div>
    ) : showUnairedMark && trailingState.kind === "countdownSeconds" ? (
      <div className="flex min-w-5 shrink-0 flex-col items-center justify-center leading-none">
        <span className="font-mono text-base text-snow/80 tabular-nums">
          {trailingState.seconds}
        </span>
        <span className="mt-0.5 font-mono text-[9px] text-muted">{countdownSecondUnit(t)}</span>
      </div>
    ) : showUnairedMark && trailingState.kind === "tbd" ? (
      <span className="shrink-0 font-mono text-[10px] text-muted uppercase tracking-widest">
        {t("episode.tbd")}
      </span>
    ) : null;
  const checkboxShellSize = "h-9 min-w-9";
  const checkboxRailClass = stretchPoster
    ? "relative flex h-11 w-11 shrink-0 items-center justify-center"
    : `relative flex shrink-0 items-center justify-center ${checkboxShellSize}`;
  const checkbox =
    showUnairedMark || hideCheckbox ? null : onToggleWatch ? (
      // biome-ignore lint/a11y/noStaticElementInteractions: isolates nested checkbox clicks from the row activator
      // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation only — keyboard activation stays on the nested checkbox
      <div
        ref={promptAnchorRef}
        className={checkboxRailClass}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {showRatingPrompt && !suppressDetailsWatchPrompt && (
          <div
            role="dialog"
            aria-label={t("rating.label")}
            className="absolute top-0 bottom-0 right-full z-10 mr-2 flex items-center gap-1.5 animate-rating-slide-left"
          >
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
              className="inline-flex min-h-7 items-center rounded-full border border-white/10 bg-void/95 px-2.5 font-mono text-[10px] uppercase tracking-widest text-muted backdrop-blur-md transition-colors hover:bg-white/[0.04] hover:text-snow"
            >
              {t("rating.skip")}
            </button>
          </div>
        )}
        {rewatched ? (
          <button
            type="button"
            disabled={checkboxDisabled}
            onClick={handleCheckboxClick}
            aria-label={t("episode.watchedCount", { count: watchCount })}
            className={`flex shrink-0 items-center justify-center px-0.5 font-mono text-sm text-yellow tabular-nums transition-opacity ${checkboxShellSize} ${
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
            variant="rounded"
            onChange={(_checked, event) => handleCheckboxClick(event)}
            aria-label={t("episode.toggleWatched")}
          />
        )}
        <EpisodeRowWatchModals
          showMarkUpToHereModal={showMarkUpToHereModal}
          onCloseMarkUpToHereModal={() => setShowMarkUpToHereModal(false)}
          showWatchedOptionsModal={showWatchedOptionsModal}
          onCloseWatchedOptionsModal={() => setShowWatchedOptionsModal(false)}
          onBulkUpToHere={onBulkUpToHere}
          onToggleWatch={onToggleWatch}
          onWatchAgain={onWatchAgain}
          onEditDate={onEditDate}
          watchCount={watchCount}
        />
      </div>
    ) : null;

  const poster = hasSeriesChrome && seriesRouteParam && (
    <Link
      ref={posterLinkRef}
      to="/series/$id"
      params={{ id: seriesRouteParam }}
      viewTransition={pageViewTransition}
      aria-label={seriesTitle}
      className={`js-poster shrink-0 overflow-hidden rounded-md bg-white/5 ${
        stretchPoster ? "w-12 self-stretch sm:w-14" : "h-12 w-8"
      }`}
      style={itemId != null ? posterMorphStyle(itemId, posterTransition) : undefined}
      onClick={(e) => {
        e.stopPropagation();
        armPosterTransition();
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

  // Reserved still frame with centered S{n}E{m} when missing/failed (amends E148 / 013 E188).
  // Spoiler protection still omits the frame entirely (E149).
  const episodeThumbnail = !hasSeriesChrome && !hideSpoilers && (
    <div className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/5">
      {stillImageUrl && !imageFailed ? (
        <MediaImage
          src={stillImageUrl}
          alt=""
          wrapperClassName="block h-full w-full"
          className="h-full w-full object-cover opacity-90"
          spinnerSize={12}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="font-mono text-[10px] text-muted tabular-nums">
          S{s}E{e}
        </span>
      )}
    </div>
  );

  const seriesTitleLink = hasSeriesChrome && seriesRouteParam && (
    <Link
      to="/series/$id"
      params={{ id: seriesRouteParam }}
      viewTransition={pageViewTransition}
      className={`${primaryClass} w-auto max-w-full self-start hover:text-yellow ${
        muted ? "text-muted-dim" : ""
      }`}
      onClick={(e) => {
        e.stopPropagation();
        armPosterTransition();
      }}
      onMouseEnter={prefetchSeries}
    >
      {seriesTitle}
    </Link>
  );

  const metaRow = (
    <div className={`flex min-w-0 items-center ${compact ? "gap-1.5" : "gap-2"}`}>
      <span className="shrink-0 font-mono text-xs text-muted">
        <EpisodeLabel s={s} e={e} format={episodeLabelFormat} />
        {overflow > 0 && <span className="ml-1 text-muted-dim">+{overflow}</span>}
      </span>
      {episodeTitle && hasSeriesChrome && (
        <>
          {compact && (
            <span className="text-muted-dim" aria-hidden>
              {t("common.separator")}
            </span>
          )}
          <span
            className={`truncate font-mono text-xs text-muted-dim ${hideSpoilers ? "blur-sm" : ""}`}
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
      {/* Centered mode stacks in a column, where `items-center` sizes children to
          max-content on the cross axis — w-full pins the width so the title's
          `truncate` engages instead of widening the page. */}
      <div className={`min-w-0 overflow-hidden ${centered ? "w-full" : "flex-1"}`}>
        <div className={primaryClass}>{episodeTitle ?? t("episode.untitled")}</div>
        <div
          className={`mt-0.5 truncate font-mono text-xs text-muted ${
            centered ? "text-center" : ""
          }`}
        >
          <EpisodeLabel s={s} e={e} format={episodeLabelFormat} />
          {airDate && (
            <>
              <span className="text-muted-dim" aria-hidden>
                {" – "}
              </span>
              <span className="tabular-nums text-snow/70">
                {formatAirDateLabel(airDate, i18n.language)}
              </span>
            </>
          )}
        </div>
      </div>
      {episodeType === "finale" && (
        <span className="inline-flex shrink-0 items-center rounded-full border border-red-400/25 bg-red-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-red-300/90">
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
    stretchPoster ? (
      seriesPrimary
    ) : (
      <>
        {poster}
        {seriesPrimary}
      </>
    )
  ) : (
    <>
      {episodeThumbnail}
      {seasonPrimary}
    </>
  );

  const trailingControls = (
    <>
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
      <button type="button" className="sr-only" onClick={openDetails}>
        {t("episode.openDetails", { title: episodeDisplayTitle })}
      </button>
    </>
  );

  return (
    <div
      className="episode-row flex min-w-0 flex-col"
      style={transitionName ? { viewTransitionName: transitionName } : undefined}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: row contains nested links/checkboxes — shell is a click target, not a nested button */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard activation stays on the nested sr-only details control */}
      <div
        className={`${shellClass} episode-row-shell cursor-pointer`}
        onClick={openDetailsFromShell}
        onMouseEnter={hasSeriesChrome ? prefetchSeries : undefined}
      >
        {stretchPoster ? (
          <>
            {poster}
            <div className={stretchContentClass}>
              {body}
              {trailingControls}
            </div>
          </>
        ) : (
          <>
            {body}
            {trailingControls}
          </>
        )}
      </div>

      <EpisodeDetailsModal
        open={showDetailsModal}
        onClose={closeDetailsModal}
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
        {...(airStamp ? { airStamp } : {})}
        watched={watched}
        myRating={myRating}
        {...(onRate ? { onRate } : {})}
        {...(onToggleWatch
          ? {
              onToggleWatched: toggleWatchFromDetails,
              toggleDisabled: checkboxDisabled,
            }
          : {})}
      />
    </div>
  );
}
