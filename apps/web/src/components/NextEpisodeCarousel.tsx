import { useCallback, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { EpisodeSummary, NextUnwatchedEpisode } from "../api/types.ts";
import { todayIso } from "../lib/date.ts";
import { EpisodeRow } from "./EpisodeRow.tsx";
import { shouldShowQuickMarkCheckbox } from "./WatchNextRow.tsx";

interface NextEpisodeCarouselProps {
  episodes: EpisodeSummary[];
  nextEpisode: NextUnwatchedEpisode;
  promptEpisodeId: number | null;
  onToggleWatch: (episode: EpisodeSummary, onMarked: () => void) => void;
  onWatchAgain: (episodeId: number) => void;
  onEditDate: (episode: EpisodeSummary) => void;
  onBulkUpToHere: (episodeId: number) => void;
  onRateEpisode: (episodeId: number, value: 1 | 2 | 3 | null) => void;
  onDismissPrompt: () => void;
}

/** Detail-page episode rail: the current next episode starts centered, with
 * chronological neighbors on either side and mouse/touch horizontal panning.
 * The inline checkbox is hidden (marking happens from the details modal), but
 * every other detail matches the season list. */
export function NextEpisodeCarousel({
  episodes,
  nextEpisode,
  promptEpisodeId,
  onToggleWatch,
  onWatchAgain,
  onEditDate,
  onBulkUpToHere,
  onRateEpisode,
  onDismissPrompt,
}: NextEpisodeCarouselProps) {
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<number, HTMLDivElement>());
  const initialEpisodeId = useRef(nextEpisode.episodeId);
  const centeredEpisodeId = useRef(nextEpisode.episodeId);
  const advanceTimer = useRef<number | null>(null);
  const resizeFrame = useRef<number | null>(null);
  const drag = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });
  const today = todayIso();

  const orderedEpisodes = [...episodes].sort((a, b) => a.s - b.s || a.e - b.e);

  const scrollToEpisode = useCallback((episodeId: number, behavior: ScrollBehavior) => {
    const viewport = viewportRef.current;
    const item = itemRefs.current.get(episodeId);
    if (!viewport || !item) return;
    centeredEpisodeId.current = episodeId;
    const viewportRect = viewport.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    viewport.scrollTo({
      left:
        viewport.scrollLeft +
        itemRect.left -
        viewportRect.left -
        (viewport.clientWidth - itemRect.width) / 2,
      behavior,
    });
  }, []);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollToEpisode(initialEpisodeId.current, "instant");
    });
    const viewport = viewportRef.current;
    const resizeObserver =
      viewport == null
        ? null
        : new ResizeObserver(() => {
            if (resizeFrame.current !== null) cancelAnimationFrame(resizeFrame.current);
            resizeFrame.current = requestAnimationFrame(() => {
              scrollToEpisode(centeredEpisodeId.current, "instant");
              resizeFrame.current = null;
            });
          });
    if (viewport) resizeObserver?.observe(viewport);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      if (resizeFrame.current !== null) cancelAnimationFrame(resizeFrame.current);
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    };
  }, [scrollToEpisode]);

  function trackCenteredEpisode() {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const viewportCenter = viewport.getBoundingClientRect().left + viewport.clientWidth / 2;
    let closestId = centeredEpisodeId.current;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const [episodeId, item] of itemRefs.current) {
      const rect = item.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestId = episodeId;
      }
    }
    centeredEpisodeId.current = closestId;
  }

  function scheduleAdvance(index: number) {
    const following = orderedEpisodes[index + 1];
    if (!following) return;
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      scrollToEpisode(following.id, "smooth");
      advanceTimer.current = null;
    }, 1000);
  }

  function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || !viewportRef.current) return;
    drag.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      scrollLeft: viewportRef.current.scrollLeft,
    };
  }

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!drag.current.active || !viewportRef.current) return;
    const distance = event.clientX - drag.current.startX;
    if (Math.abs(distance) > 5) drag.current.moved = true;
    if (!drag.current.moved) return;
    event.preventDefault();
    viewportRef.current.scrollLeft = drag.current.scrollLeft - distance;
  }

  function stopDragging() {
    drag.current.active = false;
  }

  return (
    <section className="flex flex-col gap-1 border border-white/5 bg-[#101010] pt-3">
      <h2 className="px-4 text-center font-semibold text-base text-snow">{t("series.nextUp")}</h2>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: native horizontal scroller with mouse drag enhancement */}
      <div
        ref={viewportRef}
        className="cursor-grab snap-x snap-mandatory select-none overflow-x-auto px-[6%] pb-3 active:cursor-grabbing sm:px-[15%] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        onScroll={trackCenteredEpisode}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (!drag.current.moved) return;
          event.preventDefault();
          event.stopPropagation();
          drag.current.moved = false;
        }}
      >
        <div className="flex gap-2">
          {orderedEpisodes.map((episode, index) => {
            const isAired = shouldShowQuickMarkCheckbox(episode.airDate, today);
            const hasUnwatchedBefore =
              episode.s > nextEpisode.s ||
              (episode.s === nextEpisode.s && episode.e > nextEpisode.e);

            return (
              <div
                key={episode.id}
                ref={(element) => {
                  if (element) itemRefs.current.set(episode.id, element);
                  else itemRefs.current.delete(episode.id);
                }}
                className="w-[88%] shrink-0 snap-center sm:w-[70%]"
              >
                <EpisodeRow
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
                  muted={!isAired}
                  align="center"
                  hideCheckbox
                  checkboxDisabled={!isAired}
                  onToggleWatch={() =>
                    onToggleWatch(episode, () => {
                      scheduleAdvance(index);
                    })
                  }
                  onWatchAgain={() => onWatchAgain(episode.id)}
                  onEditDate={() => onEditDate(episode)}
                  onBulkUpToHere={() => onBulkUpToHere(episode.id)}
                  hasUnwatchedBefore={hasUnwatchedBefore}
                  showRatingPrompt={promptEpisodeId === episode.id}
                  onRate={(value) => onRateEpisode(episode.id, value)}
                  onDismissPrompt={onDismissPrompt}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
