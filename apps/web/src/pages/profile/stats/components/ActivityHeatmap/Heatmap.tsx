import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useRef } from "react";

interface HeatmapProps {
  years: number[];
  /** Non-zero days only (E106) — the client renders the full year grid. */
  days: { date: string; count: number }[];
  tooltipFor: (date: string, count: number) => string;
  /** Accessible name for the scrollable activity grid. */
  ariaLabel: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BUCKET_CLASSES = ["bg-white/5", "bg-yellow/25", "bg-yellow/55", "bg-yellow/90"];

/** Fixed thresholds on daily watch-event count (E106): 0 / 1-2 / 3-5 / >=6. */
function intensityBucket(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  return 3;
}

function mondayFirstWeekday(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

/** ui.md primitive: GitHub-style day grid, week columns × 7 rows, Monday-first. Pure CSS, no JS beyond layout math. */
export function Heatmap({ years, days, tooltipFor, ariaLabel }: HeatmapProps) {
  const countByDate = new Map(days.map((d) => [d.date, d.count]));

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // Scroll to the far right (newest) on mount, assuming years are displayed older -> newer
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, []); // Re-run if years change

  const handleMouseDown = (e: ReactMouseEvent) => {
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

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();
    const walk = (e.clientX - startX.current) * 1.5;
    containerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-to-pan scroll surface
    <div
      ref={containerRef}
      role="region"
      tabIndex={0}
      aria-label={ariaLabel}
      className="overflow-x-auto touch-pan-x select-none cursor-grab active:cursor-grabbing scrollbar-hide pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      <div className="flex w-max gap-[10px]">
        {years.map((year) => {
          const jan1 = new Date(Date.UTC(year, 0, 1));
          const gridStart = new Date(jan1.getTime() - mondayFirstWeekday(jan1) * MS_PER_DAY);
          const dec31 = new Date(Date.UTC(year, 11, 31));
          const gridEnd = new Date(dec31.getTime() + (6 - mondayFirstWeekday(dec31)) * MS_PER_DAY);
          const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / MS_PER_DAY) + 1;
          const weekCount = Math.ceil(totalDays / 7);

          const weeks = Array.from({ length: weekCount }, (_, w) =>
            Array.from({ length: 7 }, (_, d) => {
              const date = new Date(gridStart.getTime() + (w * 7 + d) * MS_PER_DAY);
              const dateStr = date.toISOString().slice(0, 10);
              return {
                dateStr,
                inYear: date.getUTCFullYear() === year,
                count: countByDate.get(dateStr) ?? 0,
              };
            }),
          );

          return (
            <div key={year} className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] tracking-widest text-muted select-none">
                {year}
              </span>
              <div className="flex gap-[3px]">
                {weeks.map((week, wi) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: weeks are a fixed positional grid, never reordered.
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {week.map((cell) =>
                      cell.inYear ? (
                        <div
                          key={cell.dateStr}
                          aria-hidden
                          title={tooltipFor(cell.dateStr, cell.count)}
                          className={`h-[11px] w-[11px] ${BUCKET_CLASSES[intensityBucket(cell.count)]}`}
                        />
                      ) : (
                        <div key={cell.dateStr} aria-hidden className="h-[11px] w-[11px]" />
                      ),
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
