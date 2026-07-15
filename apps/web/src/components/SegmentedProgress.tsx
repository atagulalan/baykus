import type { SeasonProgress, WatchCategory } from "../api/types.ts";

export type Segment =
  | { kind: "filled" }
  | { kind: "frontier"; percent: number }
  | { kind: "hollow" };

const MAX_SEGMENTED_SEASONS = 12;

/**
 * E34: null means "fall back to the plain percentage bar" — a skip-around
 * watch history, zero seasons, or more than 12 seasons.
 */
export function buildProgressSegments(sp: SeasonProgress): Segment[] | null {
  if (!sp.sequential) return null;
  const { seasons } = sp;
  if (seasons.length < 1 || seasons.length > MAX_SEGMENTED_SEASONS) return null;

  const frontierIndex = seasons.findIndex((s) => s.watched < s.total);
  return seasons.map((s, i) => {
    if (frontierIndex === -1 || i < frontierIndex) return { kind: "filled" };
    if (i === frontierIndex) {
      const percent = s.total > 0 ? Math.round((s.watched / s.total) * 100) : 0;
      return { kind: "frontier", percent };
    }
    return { kind: "hollow" };
  });
}

type Size = "sm" | "md";

const TRACK_HEIGHT: Record<Size, string> = { sm: "h-1.5", md: "h-2" };
const SQUARE_SIZE: Record<Size, string> = { sm: "h-1.5 w-1.5", md: "h-2 w-2" };

const CATEGORY_COLORS: Record<WatchCategory | "default", string> = {
  stopped: "bg-red-500",
  finished: "bg-purple-500",
  up_to_date: "bg-green-500",
  watching: "bg-yellow",
  not_watched_recently: "bg-yellow",
  not_started: "bg-yellow",
  watch_later: "bg-yellow",
  default: "bg-yellow",
};

interface SegmentedProgressProps {
  seasonProgress: SeasonProgress;
  watched: number;
  aired: number;
  category?: WatchCategory;
  size?: Size;
  className?: string;
}

/** Season-segmented progress bar with a plain-percentage fallback (E34). */
export function SegmentedProgress({
  seasonProgress,
  watched,
  aired,
  category,
  size = "sm",
  className = "",
}: SegmentedProgressProps) {
  const segments = buildProgressSegments(seasonProgress);
  const colorClass = category ? CATEGORY_COLORS[category] : CATEGORY_COLORS.default;

  if (segments === null) {
    const percent = aired > 0 ? Math.round((watched / aired) * 100) : 0;
    return (
      <div className={`w-full overflow-hidden bg-white/5 ${TRACK_HEIGHT[size]} ${className}`}>
        <div
          className={`h-full ${colorClass} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  }

  return (
    <div className={`flex w-full items-center gap-[1px] ${className}`}>
      {segments.map((segment, i) => {
        const key = `${segment.kind}-${i}`;
        if (segment.kind === "frontier") {
          return (
            <div key={key} className={`flex-1 overflow-hidden bg-white/5 ${TRACK_HEIGHT[size]}`}>
              <div
                className={`h-full ${colorClass} transition-all duration-500`}
                style={{ width: `${segment.percent}%` }}
              />
            </div>
          );
        }
        return (
          <div
            key={key}
            className={`shrink-0 ${SQUARE_SIZE[size]} transition-colors ${
              segment.kind === "filled" ? colorClass : "bg-white/5"
            }`}
          />
        );
      })}
    </div>
  );
}
