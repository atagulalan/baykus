import type { WatchCategory } from "../api/types.ts";

/**
 * Shared accents from `@baykus/ui` — chart-only palette stays web-local below.
 */
export {
  CATEGORY_BG_COLORS,
  CATEGORY_TEXT_COLORS,
  progressTextColor,
} from "@baykus/ui/lib/categoryColors";

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
