import type { WatchCategory } from "../api/types.ts";

/** E45/E46: shared per-category accent — yellow for every "still going" category, red/purple/green for the terminal ones. */
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
