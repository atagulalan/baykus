/**
 * Category accent classes for progress beads (E45/E46 / E185).
 * Keep in sync with apps/web `lib/categoryColors.ts`.
 */

export type WatchCategory =
  | "needs_review"
  | "stopped"
  | "finished"
  | "up_to_date"
  | "watching"
  | "not_watched_recently"
  | "not_started"
  | "watch_later";

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

/** Watched/aired counter accent — muted when nothing watched yet. */
export function progressTextColor(category: WatchCategory, watched: number): string {
  if (watched === 0) return "text-muted";
  return CATEGORY_TEXT_COLORS[category] || CATEGORY_TEXT_COLORS.default;
}
