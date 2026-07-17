import {
  AlertCircle,
  Bookmark,
  CheckCircle,
  CircleDashed,
  CircleX,
  Clock,
  Play,
  Trophy,
} from "lucide-react";
import type { WatchCategory } from "../api/types.ts";

/**
 * Maps each WatchCategory to a lucide-react icon component (E123).
 * Rendered at `size={12}` inline before category labels.
 */
export const CATEGORY_ICONS: Record<WatchCategory, typeof Play> = {
  watching: Play,
  not_watched_recently: Clock,
  up_to_date: CheckCircle,
  finished: Trophy,
  not_started: CircleDashed,
  watch_later: Bookmark,
  stopped: CircleX,
  needs_review: AlertCircle,
};
