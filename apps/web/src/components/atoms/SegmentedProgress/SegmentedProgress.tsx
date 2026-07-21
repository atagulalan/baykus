import type { SeasonProgress, WatchCategory } from "../../../api/types.ts";
import { CATEGORY_BG_COLORS } from "../../../lib/categoryColors.ts";

export type Segment =
  | { kind: "filled" }
  | { kind: "frontier"; percent: number }
  | { kind: "hollow" };

const MAX_SEGMENTED_SEASONS = 12;

/**
 * M43: when the frontier season is 0% watched (and not the first segment),
 * paint this many px of fill so the bar isn't fully invisible.
 * `0` disables the sliver. Keep in sync with `@baykus/ui` `EMPTY_FRONTIER_MIN_PX`.
 */
export const EMPTY_FRONTIER_MIN_PX = 0;

/** Width for a frontier fill — percent, or `EMPTY_FRONTIER_MIN_PX` when applicable. */
export function frontierFillWidth(
  percent: number,
  segmentIndex: number,
): { unit: "px"; value: number } | { unit: "%"; value: number } {
  if (percent === 0 && segmentIndex > 0 && EMPTY_FRONTIER_MIN_PX > 0) {
    return { unit: "px", value: EMPTY_FRONTIER_MIN_PX };
  }
  return { unit: "%", value: percent };
}

/** E180/E185: donut bead — aired caught-up with unaired remaining. */
const CAUGHT_UP_BEAD = "box-border border border-green-500 bg-transparent";

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

/** Same predicate as CircularProgress `caughtUp` (E180): aired done, unaired remain. */
export function isCaughtUpWaiting(entry: {
  watched: number;
  total: number;
  announced: number;
}): boolean {
  return entry.total > 0 && entry.watched >= entry.total && entry.announced > entry.total;
}

/**
 * Prefer announced counts from the season episode lists (same source as the
 * accordion rings) so hero beads stay in lockstep with CircularProgress.
 */
export function alignSeasonProgressAnnounced(
  seasonProgress: SeasonProgress,
  seasons: Array<{ number: number; episodes: readonly unknown[] }>,
): SeasonProgress {
  const announcedByNumber = new Map(
    seasons.filter((s) => s.number !== 0).map((s) => [s.number, s.episodes.length]),
  );
  return {
    ...seasonProgress,
    seasons: seasonProgress.seasons.map((entry) => ({
      ...entry,
      announced: announcedByNumber.get(entry.number) ?? entry.announced ?? entry.total,
    })),
  };
}

type Size = "sm" | "md";

const TRACK_HEIGHT: Record<Size, string> = { sm: "h-1.5", md: "h-2" };
const SQUARE_SIZE: Record<Size, string> = { sm: "h-1.5 w-1.5", md: "h-2 w-2" };

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
  const colorClass = category ? CATEGORY_BG_COLORS[category] : CATEGORY_BG_COLORS.default;

  if (segments === null) {
    const percent = aired > 0 ? Math.round((watched / aired) * 100) : 0;
    return (
      <div
        className={`w-full overflow-hidden rounded-full bg-white/[0.08] ${TRACK_HEIGHT[size]} ${className}`}
      >
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  }

  return (
    <div className={`flex w-full items-center gap-0.5 ${className}`}>
      {segments.map((segment, i) => {
        const key = `${segment.kind}-${i}`;
        if (segment.kind === "frontier") {
          const fill = frontierFillWidth(segment.percent, i);
          return (
            <div
              key={key}
              className={`flex-1 overflow-hidden rounded-full bg-white/[0.08] ${TRACK_HEIGHT[size]}`}
            >
              <div
                className={`h-full rounded-full ${colorClass} transition-all duration-500`}
                style={{
                  width: fill.unit === "px" ? `${fill.value}px` : `${fill.value}%`,
                }}
              />
            </div>
          );
        }
        const entry = seasonProgress.seasons[i];
        const filledClass =
          segment.kind === "filled" && entry && isCaughtUpWaiting(entry)
            ? CAUGHT_UP_BEAD
            : colorClass;
        return (
          <div
            key={key}
            className={`shrink-0 rounded-full ${SQUARE_SIZE[size]} transition-colors ${
              segment.kind === "filled" ? filledClass : "bg-white/[0.08]"
            }`}
          />
        );
      })}
    </div>
  );
}
