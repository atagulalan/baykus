import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CalendarDay, CalendarEntry } from "../api/types.ts";
import { getAbsoluteWeek, getIsoWeek, getWeekStartIso, todayIso } from "../lib/date.ts";
import { EpisodeLabel } from "./EpisodeLabel.tsx";

function getMockTimeData(itemId: number) {
  // Generate a consistent pseudo-random time based on the itemId
  const seed = (itemId * 13) % 24;
  const hour = seed.toString().padStart(2, "0");
  const localTime = `${hour}:00`;
  // Fake an origin timezone offset (e.g. EST is UTC-5)
  const _tzOffset = -5;
  // Let's assume the local timezone is UTC+3 (Istanbul), so difference is 8 hours
  const diff = -8;
  const originHour = (seed + diff + 24) % 24;
  const originTime = `${originHour.toString().padStart(2, "0")}:00 EST`;

  return { localTime, originTime };
}

function MockReleaseTime({ itemId, isWatched }: { itemId: number; isWatched: boolean }) {
  const [showOrigin, setShowOrigin] = useState(false);
  const { localTime, originTime } = getMockTimeData(itemId);

  return (
    <button
      type="button"
      className={`text-[9px] font-medium ml-1 px-1 rounded cursor-pointer transition-colors ${
        isWatched
          ? "bg-white/10 text-muted hover:bg-white/20 hover:text-snow"
          : "bg-white/5 text-muted hover:bg-white/15 hover:text-snow border border-white/5"
      }`}
      onClick={(e) => {
        e.preventDefault();
        setShowOrigin((p) => !p);
      }}
      title={showOrigin ? `Yerel Saat: ${localTime}` : `Orijinal Saat: ${originTime}`}
    >
      {showOrigin ? originTime : localTime}
    </button>
  );
}

interface StripEpisode {
  episodeId: number;
  s: number;
  e: number;
  weekIndex: number;
  date: string;
  entry: CalendarEntry;
}

interface SeriesStrip {
  stripKey: string;
  itemId: number;
  title: string;
  posterRef: string | null;
  episodes: StripEpisode[];
  startWeek: number;
  endWeek: number;
}

/** Locale weekday labels, Monday first */
function weekdayFullLabels(): string[] {
  const monday = new Date(Date.UTC(2024, 0, 1)); // 2024-01-01 was a Monday (UTC)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    return new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(d);
  });
}

interface ScheduleGridProps {
  days: CalendarDay[];
  minFetchedAbsWeek?: number | undefined;
  maxFetchedAbsWeek?: number | undefined;
  hasNextPageRight?: boolean;
  hasNextPageLeft?: boolean;
  onVisibleWeekChange?: (label: string) => void;
  autoScrollToCurrentWeek?: boolean;
  onLoadMoreLeft?: () => void;
  onLoadMoreRight?: () => void;
}

export function ScheduleGrid({
  days,
  minFetchedAbsWeek,
  maxFetchedAbsWeek,
  hasNextPageRight,
  hasNextPageLeft,
  onVisibleWeekChange,
  autoScrollToCurrentWeek = false,
  onLoadMoreLeft,
  onLoadMoreRight,
}: ScheduleGridProps) {
  const { t } = useTranslation();
  const today = todayIso();
  const currentAbsWeek = getAbsoluteWeek(today);
  const currentIsoYear = getIsoWeek(today).year;
  const [focusedAbsWeek, setFocusedAbsWeek] = useState(currentAbsWeek);

  // Determine the range of weeks
  let minAbsWeek = currentAbsWeek - 2;
  let maxAbsWeek = currentAbsWeek + 2;

  if (minFetchedAbsWeek !== undefined && maxFetchedAbsWeek !== undefined) {
    minAbsWeek = minFetchedAbsWeek;
    maxAbsWeek = maxFetchedAbsWeek;
  } else {
    for (const day of days) {
      const w = getAbsoluteWeek(day.date);
      if (w < minAbsWeek) minAbsWeek = w;
      if (w > maxAbsWeek) maxAbsWeek = w;
    }
  }

  if (currentAbsWeek < minAbsWeek) minAbsWeek = currentAbsWeek;
  if (currentAbsWeek > maxAbsWeek) maxAbsWeek = currentAbsWeek;

  const windowMin = focusedAbsWeek - 12;
  const windowMax = focusedAbsWeek + 12;

  const weekdayLabels = weekdayFullLabels();

  const seriesInfoMap = new Map<string, SeriesStrip & { dow: number }>();

  for (const day of days) {
    const d = new Date(`${day.date}T00:00:00Z`);
    const dow = ((d.getUTCDay() + 6) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const absWeek = getAbsoluteWeek(day.date);
    const localWeekIdx = absWeek - minAbsWeek;
    const _inWindow = absWeek >= windowMin && absWeek <= windowMax;

    for (const entry of day.entries) {
      // Group by Day of Week, Series, and Season to prevent large gaps between seasons
      const key = `${dow}-${entry.itemId}-S${entry.s}`;
      if (!seriesInfoMap.has(key)) {
        seriesInfoMap.set(key, {
          stripKey: key,
          itemId: entry.itemId,
          title: entry.title,
          posterRef: entry.posterRef,
          dow,
          startWeek: localWeekIdx,
          endWeek: localWeekIdx,
          episodes: [],
        });
      }
      const strip = seriesInfoMap.get(key);
      if (!strip) continue;
      strip.startWeek = Math.min(strip.startWeek, localWeekIdx);
      strip.endWeek = Math.max(strip.endWeek, localWeekIdx);

      strip.episodes.push({
        episodeId: entry.episodeId,
        s: entry.s,
        e: entry.e,
        weekIndex: localWeekIdx,
        date: day.date,
        entry,
      });
    }
  }

  // Group by Day of Week (0-6)
  const stripsByDay: Record<0 | 1 | 2 | 3 | 4 | 5 | 6, SeriesStrip[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };

  for (const info of seriesInfoMap.values()) {
    // Only show strips that have at least one unwatched episode (so we don't show fully watched past seasons)
    const isFullyWatched = info.episodes.every((ep) => ep.entry.isWatched);
    if (!isFullyWatched) {
      const dow = info.dow as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      stripsByDay[dow].push(info);
    }
  }

  const activeWeeksSet = new Set<number>();
  activeWeeksSet.add(currentAbsWeek);
  for (const dow of [0, 1, 2, 3, 4, 5, 6] as const) {
    for (const strip of stripsByDay[dow]) {
      for (const ep of strip.episodes) {
        activeWeeksSet.add(minAbsWeek + ep.weekIndex);
      }
    }
  }

  type RenderedColumn =
    | { type: "week"; absWeek: number }
    | { type: "gap"; startAbsWeek: number; endAbsWeek: number };

  const GAP_THRESHOLD = 4;
  const renderedColumns: RenderedColumn[] = [];
  const absWeekToColIndex = new Map<number, number>();

  let w = minAbsWeek;
  while (w <= maxAbsWeek) {
    if (activeWeeksSet.has(w)) {
      absWeekToColIndex.set(w, renderedColumns.length);
      renderedColumns.push({ type: "week", absWeek: w });
      w++;
    } else {
      let nextActive = w + 1;
      while (nextActive <= maxAbsWeek && !activeWeeksSet.has(nextActive)) {
        nextActive++;
      }
      const gapLength = nextActive - w;
      if (gapLength >= GAP_THRESHOLD) {
        for (let g = w; g < nextActive; g++) {
          absWeekToColIndex.set(g, renderedColumns.length);
        }
        renderedColumns.push({ type: "gap", startAbsWeek: w, endAbsWeek: nextActive - 1 });
      } else {
        for (let g = w; g < nextActive; g++) {
          absWeekToColIndex.set(g, renderedColumns.length);
          renderedColumns.push({ type: "week", absWeek: g });
        }
      }
      w = nextActive;
    }
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const headersRef = useRef<(HTMLDivElement | null)[]>([]);
  const _rowContentRefs = useRef<(HTMLDivElement | null)[]>([
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  const [hasScrolled, setHasScrolled] = useState(false);

  // Intersection observer for tracking visible week range
  const visibleWeeksRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!onVisibleWeekChange || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let hasChanges = false;
        for (const entry of entries) {
          const absStr = entry.target.getAttribute("data-abs-week");
          if (!absStr) continue;
          const abs = parseInt(absStr, 10);
          if (entry.isIntersecting) {
            if (!visibleWeeksRef.current.has(abs)) {
              visibleWeeksRef.current.add(abs);
              hasChanges = true;
            }
          } else {
            if (visibleWeeksRef.current.has(abs)) {
              visibleWeeksRef.current.delete(abs);
              hasChanges = true;
            }
          }
        }

        if (hasChanges && visibleWeeksRef.current.size > 0) {
          const absWeeks = Array.from(visibleWeeksRef.current);
          const minAbs = Math.min(...absWeeks);
          const maxAbs = Math.max(...absWeeks);

          const minIso = getIsoWeek(getWeekStartIso(minAbs));
          const maxIso = getIsoWeek(getWeekStartIso(maxAbs));

          let rangeLabel = "";
          if (minAbs === maxAbs) {
            rangeLabel =
              minIso.year === currentIsoYear
                ? `${minIso.week}. Hafta`
                : `${minIso.year} - ${minIso.week}. Hafta`;
          } else if (minIso.year === maxIso.year) {
            rangeLabel =
              minIso.year === currentIsoYear
                ? `${minIso.week}-${maxIso.week}. Hafta`
                : `${minIso.year} - ${minIso.week}-${maxIso.week}. Hafta`;
          } else {
            rangeLabel = `${minIso.year} ${minIso.week}. Hafta - ${maxIso.year} ${maxIso.week}. Hafta`;
          }
          onVisibleWeekChange(rangeLabel);
        }

        // Update focusedAbsWeek using the center of the container
        const containerEl = containerRef.current;
        if (!containerEl) return;
        const containerRect = containerEl.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;
        let closestAbs = -1;
        let minDistance = Infinity;

        for (const abs of visibleWeeksRef.current) {
          const colIndex = absWeekToColIndex.get(abs);
          if (colIndex === undefined) continue;
          const h = headersRef.current[colIndex];
          if (h) {
            const rect = h.getBoundingClientRect();
            const center = rect.left + rect.width / 2;
            const distance = Math.abs(center - containerCenter);
            if (distance < minDistance) {
              minDistance = distance;
              closestAbs = abs;
            }
          }
        }

        if (closestAbs !== -1) {
          setFocusedAbsWeek(closestAbs);
        }
      },
      {
        root: containerRef.current,
        rootMargin: "0px 0px 0px 0px",
        threshold: 0,
      },
    );

    const currentHeaders = headersRef.current;
    currentHeaders.forEach((h) => {
      if (h) observer.observe(h);
    });

    return () => {
      observer.disconnect();
      visibleWeeksRef.current.clear();
    };
  }, [onVisibleWeekChange, currentIsoYear, absWeekToColIndex.get]);

  // Initial scroll to current week
  useEffect(() => {
    if (
      autoScrollToCurrentWeek &&
      !hasScrolled &&
      containerRef.current &&
      renderedColumns.length > 0
    ) {
      const currentIdx = absWeekToColIndex.get(currentAbsWeek);
      if (currentIdx !== undefined) {
        // Approximate width of each column is 70px
        const scrollTarget = currentIdx * 70 - containerRef.current.clientWidth / 2 + 35;
        containerRef.current.scrollTo({
          left: Math.max(0, scrollTarget),
          behavior: "instant",
        });
        setHasScrolled(true);
      }
    }
  }, [
    autoScrollToCurrentWeek,
    hasScrolled,
    currentAbsWeek,
    absWeekToColIndex,
    renderedColumns.length,
  ]);

  // Preserve scroll position when prepending historical data
  const prevFirstAbsWeekRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (containerRef.current && renderedColumns.length > 0) {
      const firstCol = renderedColumns[0];
      if (!firstCol) return;
      const currentFirstAbsWeek =
        firstCol.type === "week" ? firstCol.absWeek : firstCol.startAbsWeek;
      const prevFirstAbsWeek = prevFirstAbsWeekRef.current;

      if (prevFirstAbsWeek !== null && prevFirstAbsWeek !== currentFirstAbsWeek) {
        if (currentFirstAbsWeek < prevFirstAbsWeek) {
          const oldFirstColIdx = absWeekToColIndex.get(prevFirstAbsWeek);
          if (oldFirstColIdx !== undefined) {
            const shiftPx = oldFirstColIdx * 70;
            containerRef.current.scrollLeft += shiftPx;
            if (isDragging.current) {
              scrollLeft.current += shiftPx; // Fix the drag anchor so it doesn't jump!
            }
          }
        }
      }
      prevFirstAbsWeekRef.current = currentFirstAbsWeek;
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: renderedColumns is rebuilt each render; we only need its first absWeek identity
  }, [renderedColumns, absWeekToColIndex]);

  // Automatically fetch more if the screen is wider than the content
  // Since onLoadMore is now stable, this will only run when totalWeeks changes, avoiding infinite loops.
  useEffect(() => {
    if (containerRef.current) {
      const target = containerRef.current;
      if (target.scrollWidth <= target.clientWidth + 300) {
        if (onLoadMoreLeft) onLoadMoreLeft();
        if (onLoadMoreRight) onLoadMoreRight();
      }
    }
  }, [onLoadMoreLeft, onLoadMoreRight]);

  const updateScales = useCallback(() => {
    const target = containerRef.current;
    if (!target) return;

    // Viewport covers from scrollLeft to scrollLeft + clientWidth
    const leftCol = target.scrollLeft / 70;
    const rightCol = (target.scrollLeft + target.clientWidth) / 70;

    for (let dow = 0; dow < 7; dow++) {
      const strips = stripsByDay[dow as 0 | 1 | 2 | 3 | 4 | 5 | 6];
      let maxScale = 0;

      for (const strip of strips) {
        let minDistance = Infinity;
        for (const ep of strip.episodes) {
          const epCol = absWeekToColIndex.get(minAbsWeek + ep.weekIndex);
          if (epCol === undefined) continue;
          let dist = 0;
          if (epCol < leftCol) dist = leftCol - epCol;
          else if (epCol > rightCol) dist = epCol - rightCol;

          if (dist < minDistance) minDistance = dist;
        }

        let scale = 0;
        if (minDistance <= 0) scale = 1;
        else if (minDistance >= 2) scale = 0;
        else scale = 1 - minDistance / 2;

        target.style.setProperty(`--strip-scale-${strip.stripKey}`, scale.toString());
        if (scale > maxScale) maxScale = scale;
      }

      target.style.setProperty(`--dow-max-scale-${dow}`, maxScale.toString());
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: stripsByDay is derived from days each render; absWeek map is the stable trigger we care about
  }, [minAbsWeek, stripsByDay, absWeekToColIndex]);

  // Initial scales setup
  useLayoutEffect(() => {
    updateScales();
  }, [updateScales]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    updateScales();
    const target = e.currentTarget;
    if (target.scrollLeft < 300 && onLoadMoreLeft) {
      onLoadMoreLeft();
    }
    if (target.scrollWidth - target.clientWidth - target.scrollLeft < 300 && onLoadMoreRight) {
      onLoadMoreRight();
    }
  };

  // Mouse drag-to-scroll logic
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    scrollLeft.current = containerRef.current?.scrollLeft || 0;
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();
    const walk = (e.clientX - startX.current) * 1.5; // drag speed multiplier
    containerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  // Dynamic grid width to ensure columns don't compress
  const minContainerWidth = Math.max(400, renderedColumns.length * 70); // 70px per column

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-to-pan scroll surface; keyboard uses native overflow scrolling
    <div
      ref={containerRef}
      className="overflow-x-auto touch-pan-x scrollbar-hide pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none cursor-grab active:cursor-grabbing"
      style={{
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
      }}
      onScroll={handleScroll}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      <div
        className="flex flex-col gap-px bg-white/5 border border-white/5 font-mono rounded relative"
        style={{ minWidth: `${minContainerWidth}px` }}
      >
        {hasNextPageLeft === false && (
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-r from-void to-transparent flex items-center justify-start pl-8 pointer-events-none z-50">
            <span className="font-mono text-xs text-muted/50 uppercase tracking-widest whitespace-nowrap">
              ⟵ Nothing further
            </span>
          </div>
        )}
        {hasNextPageRight === false && (
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-void to-transparent flex items-center justify-end pr-8 pointer-events-none z-50">
            <span className="font-mono text-xs text-muted/50 uppercase tracking-widest whitespace-nowrap">
              Nothing further ⟶
            </span>
          </div>
        )}
        {/* Header row: Weeks */}
        <div className="flex bg-void relative">
          <div
            className="flex-1 grid"
            style={{ gridTemplateColumns: `repeat(${renderedColumns.length}, 1fr)` }}
          >
            {renderedColumns.map((col, i) => {
              if (col.type === "gap") {
                return (
                  <div
                    key={`gap-${col.startAbsWeek}`}
                    className="px-2 py-2 border-l border-white/5 text-muted/30 text-[10px] flex items-center justify-center uppercase tracking-widest relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]" />
                    <span className="relative z-10 font-bold">···</span>
                  </div>
                );
              }

              const iso = getIsoWeek(getWeekStartIso(col.absWeek));
              const isCurrentYear = iso.year === currentIsoYear;
              const label = isCurrentYear
                ? t("calendar.weekHeaderCurrentYear", {
                    week: iso.week,
                    defaultValue: `${iso.week}. Hafta`,
                  })
                : t("calendar.weekHeader", {
                    year: iso.year,
                    week: iso.week,
                    defaultValue: `${iso.year} - ${iso.week}. Hafta`,
                  });
              return (
                <div
                  key={col.absWeek}
                  ref={(el) => {
                    headersRef.current[i] = el;
                  }}
                  data-week-label={label}
                  data-abs-week={col.absWeek}
                  className="px-2 py-2 border-l border-white/5 text-muted text-[10px] uppercase text-center tracking-widest relative"
                >
                  {col.absWeek === currentAbsWeek && (
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-yellow" />
                  )}
                  {label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body rows: Days of the week */}
        {(() => {
          return weekdayLabels.map((label, dowNum) => {
            const dow = dowNum as 0 | 1 | 2 | 3 | 4 | 5 | 6;
            const strips = stripsByDay[dow];
            const isEmpty = strips.length === 0;

            return (
              <div
                key={dow}
                className="flex flex-col bg-[#101010] relative border-t border-white/5 min-h-[32px]"
              >
                <div className="flex flex-col relative z-0 flex-1 min-h-0">
                  <div
                    className="absolute inset-0 grid pointer-events-none"
                    style={{
                      gridTemplateColumns: `repeat(${renderedColumns.length}, 1fr)`,
                    }}
                  >
                    {renderedColumns.map((col) => (
                      <div
                        key={
                          col.type === "week"
                            ? `week-${col.absWeek}`
                            : `gap-${col.startAbsWeek}-${col.endAbsWeek}`
                        }
                        className={`border-l border-white/5 ${col.type === "week" && col.absWeek === currentAbsWeek ? "bg-yellow/5" : ""} ${col.type === "gap" ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]" : ""}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Sticky Day Label */}
                <div className="sticky left-2 top-0 z-20 w-max pt-1 pointer-events-none h-0 overflow-visible">
                  <span className="font-display italic font-bold text-snow text-[14px] drop-shadow-md">
                    {label}
                  </span>
                </div>

                <div
                  className="grid transition-all duration-100 ease-out"
                  style={{
                    paddingTop: `calc(28px * var(--dow-max-scale-${dow}, ${isEmpty ? 0 : 1}))`,
                    paddingBottom: `calc(8px * var(--dow-max-scale-${dow}, ${isEmpty ? 0 : 1}))`,
                  }}
                >
                  <div className="overflow-visible">
                    {!isEmpty && (
                      <div
                        className="relative"
                        style={{
                          gridTemplateColumns: `repeat(${renderedColumns.length}, 1fr)`,
                          gridAutoRows: "max-content",
                          gridAutoFlow: "row dense",
                          gap: 0,
                          display: "grid",
                        }}
                      >
                        {strips
                          .slice()
                          .sort((a, b) => a.startWeek - b.startWeek)
                          .map((strip) => {
                            const startColIdx =
                              absWeekToColIndex.get(minAbsWeek + strip.startWeek) ?? 0;
                            const endColIdx =
                              absWeekToColIndex.get(minAbsWeek + strip.endWeek) ?? startColIdx;
                            const colStart = startColIdx + 1;
                            const colSpan = endColIdx - startColIdx + 1;
                            return (
                              <div
                                key={strip.itemId}
                                className="relative z-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded flex flex-col justify-center min-h-[0px] transition-colors group overflow-hidden"
                                style={{
                                  gridColumn: `${colStart} / span ${colSpan}`,
                                  minHeight: `calc(48px * var(--strip-scale-${strip.stripKey}, 1))`,
                                  height: `calc(48px * var(--strip-scale-${strip.stripKey}, 1))`,
                                  opacity: `var(--strip-scale-${strip.stripKey}, 1)`,
                                  marginTop: `calc(4px * var(--strip-scale-${strip.stripKey}, 1))`,
                                  paddingTop: `calc(4px * var(--strip-scale-${strip.stripKey}, 1))`,
                                  paddingBottom: `calc(4px * var(--strip-scale-${strip.stripKey}, 1))`,
                                }}
                              >
                                <div
                                  className="sticky left-2 z-20 w-max px-2 mb-1"
                                  style={{
                                    maxWidth: `${Math.min(colSpan * 70 - 8, 160)}px`,
                                  }}
                                >
                                  <Link
                                    to="/series/$id"
                                    params={{ id: `i${strip.itemId}` }}
                                    className="font-display italic text-snow hover:text-yellow transition-colors text-[11px] drop-shadow-md block truncate"
                                  >
                                    {strip.title}
                                  </Link>
                                </div>

                                <div
                                  className="grid pointer-events-none w-full gap-0"
                                  style={{
                                    gridTemplateColumns: `repeat(${colSpan}, 1fr)`,
                                  }}
                                >
                                  {Array.from({ length: colSpan }).map((_, localIdx) => {
                                    const weekKey = minAbsWeek + strip.startWeek + localIdx;
                                    const columnEpisodes = strip.episodes.filter(
                                      (ep) => ep.weekIndex - strip.startWeek === localIdx,
                                    );
                                    if (columnEpisodes.length === 0) {
                                      return <div key={`${strip.stripKey}-empty-${weekKey}`} />;
                                    }

                                    return (
                                      <div
                                        key={`${strip.stripKey}-week-${weekKey}`}
                                        className="flex flex-row items-center justify-start pointer-events-auto px-2 pb-1"
                                        style={{ gridColumn: localIdx + 1 }}
                                      >
                                        {(() => {
                                          const firstEp = columnEpisodes[0];
                                          if (!firstEp) return null;
                                          const isToday = columnEpisodes.some(
                                            (ep) => ep.date === today,
                                          );
                                          const isWatched = columnEpisodes.every(
                                            (ep) => ep.entry.isWatched,
                                          );
                                          const extraCount = columnEpisodes.length - 1;

                                          return (
                                            <Link
                                              to="/series/$id"
                                              params={{ id: `i${strip.itemId}` }}
                                              className={`text-[10px] font-mono transition-colors flex flex-row items-center gap-1 ${
                                                isToday
                                                  ? "text-yellow hover:text-yellow/80"
                                                  : isWatched
                                                    ? "text-muted/50 hover:text-muted"
                                                    : "text-snow hover:text-yellow"
                                              }`}
                                              title={columnEpisodes
                                                .map((ep) => `S${ep.s}E${ep.e}`)
                                                .join(", ")}
                                            >
                                              <EpisodeLabel s={firstEp.s} e={firstEp.e} />
                                              <MockReleaseTime
                                                itemId={strip.itemId}
                                                isWatched={isWatched}
                                              />
                                              {extraCount > 0 && (
                                                <span className="text-yellow text-[9px] font-bold px-1 rounded bg-yellow/10">
                                                  +{extraCount}
                                                </span>
                                              )}
                                            </Link>
                                          );
                                        })()}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
