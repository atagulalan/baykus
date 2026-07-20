import type { WatchCategory } from "../api/types.ts";

/**
 * E45/E46: shared per-category accent — yellow for every "still going"
 * category, red/purple/green for the terminal ones. E185: a caught-up season
 * bead is a green donut when `announced > total` — same as CircularProgress
 * caughtUp (green ring, no check).
 */
export const CATEGORY_BG_COLORS: Record<WatchCategory | "default", string> = {
  needs_review: "bg-orange-500",
  stopped: "bg-red-500",
  finished: "bg-purple-500",
  up_to_date: "bg-green-500",
  watching: "bg-yellow",
  not_watched_recently: "bg-yellow",
  not_started: "bg-yellow",
  watch_later: "bg-yellow",
  default: "bg-yellow",
};

export const CATEGORY_TEXT_COLORS: Record<WatchCategory | "default", string> = {
  needs_review: "text-orange-500",
  stopped: "text-red-500",
  finished: "text-purple-500",
  up_to_date: "text-green-500",
  watching: "text-yellow",
  not_watched_recently: "text-yellow",
  not_started: "text-yellow",
  watch_later: "text-yellow",
  default: "text-yellow",
};

/**
 * Watched/aired counter accent. A series with nothing watched yet has no
 * progress to accent — it stays muted whatever its category, so the colored
 * counters read as "there is progress here".
 */
export function progressTextColor(category: WatchCategory, watched: number): string {
  if (watched === 0) return "text-muted";
  return CATEGORY_TEXT_COLORS[category] || CATEGORY_TEXT_COLORS.default;
}

/**
 * Stats İzleme Durumu palette — one distinct hue per category.
 * E55's shared yellow is fine for single-series accents, but adjacent
 * yellow segments are unreadable; chart colors diverge only for the
 * yellow cluster. Terminal hues stay E55-aligned. `needs_review` is
 * omitted — import-review noise doesn't belong in the status chart.
 */
export const CATEGORY_CHART_COLORS: Record<Exclude<WatchCategory, "needs_review">, string> = {
  watching: "bg-yellow",
  not_watched_recently: "bg-amber-600",
  not_started: "bg-sky-400",
  watch_later: "bg-blue-500",
  up_to_date: "bg-green-500",
  finished: "bg-purple-500",
  stopped: "bg-red-500",
};

/** Categories shown in the stats İzleme Durumu stacked bar (excludes needs_review). */
export const CHART_CATEGORY_ORDER: Array<keyof typeof CATEGORY_CHART_COLORS> = [
  "watching",
  "not_watched_recently",
  "not_started",
  "watch_later",
  "up_to_date",
  "finished",
  "stopped",
];
