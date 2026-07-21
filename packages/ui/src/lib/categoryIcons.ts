import {
  AlertCircle,
  Bookmark,
  CheckCircle,
  CircleDashed,
  CircleX,
  Clock,
  type LucideIcon,
  Play,
  Trophy,
} from "lucide-react-native";
import type { WatchCategory } from "./categoryColors.ts";

/**
 * Maps each WatchCategory to a lucide-react-native icon (web E123 parity).
 * Rendered at size 14 on SectionHeader / AddSectionBar.
 */
export const CATEGORY_ICONS: Record<WatchCategory, LucideIcon> = {
  watching: Play,
  not_watched_recently: Clock,
  up_to_date: CheckCircle,
  finished: Trophy,
  not_started: CircleDashed,
  watch_later: Bookmark,
  stopped: CircleX,
  needs_review: AlertCircle,
};
