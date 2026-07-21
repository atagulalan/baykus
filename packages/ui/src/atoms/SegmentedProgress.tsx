/// <reference types="nativewind/types" />
import { View } from "react-native";
import { CATEGORY_BG_COLORS, type WatchCategory } from "../lib/categoryColors.ts";
import { cn } from "../lib/cn.ts";
import {
  buildProgressSegments,
  isCaughtUpWaiting,
  type SeasonProgress,
} from "../lib/progressSegments.ts";

/** E180/E185: donut bead — aired caught-up with unaired remaining. */
const CAUGHT_UP_BEAD = "border border-green-500 bg-transparent";

type Size = "sm" | "md";

const TRACK_HEIGHT: Record<Size, string> = { sm: "h-1.5", md: "h-2" };
const SQUARE_SIZE: Record<Size, string> = { sm: "h-1.5 w-1.5", md: "h-2 w-2" };

export type SegmentedProgressProps = {
  seasonProgress: SeasonProgress;
  watched: number;
  aired: number;
  category?: WatchCategory;
  size?: Size;
  className?: string;
};

/** Season-segmented progress bar with plain-percentage fallback (E34). */
export function SegmentedProgress({
  seasonProgress,
  watched,
  aired,
  category,
  size = "sm",
  className,
}: SegmentedProgressProps) {
  const segments = buildProgressSegments(seasonProgress);
  const colorClass = category ? CATEGORY_BG_COLORS[category] : CATEGORY_BG_COLORS.default;

  if (segments === null) {
    const percent = aired > 0 ? Math.round((watched / aired) * 100) : 0;
    return (
      <View
        className={cn(
          "w-full overflow-hidden rounded-full bg-white/10",
          TRACK_HEIGHT[size],
          className,
        )}
      >
        <View className={cn("h-full rounded-full", colorClass)} style={{ width: `${percent}%` }} />
      </View>
    );
  }

  return (
    <View className={cn("w-full flex-row items-center gap-0.5", className)}>
      {segments.map((segment, i) => {
        const key = `${segment.kind}-${i}`;
        if (segment.kind === "frontier") {
          return (
            <View
              key={key}
              className={cn("flex-1 overflow-hidden rounded-full bg-white/10", TRACK_HEIGHT[size])}
            >
              <View
                className={cn("h-full rounded-full", colorClass)}
                style={{
                  width: segment.percent === 0 && i > 0 ? 1 : `${segment.percent}%`,
                }}
              />
            </View>
          );
        }
        const entry = seasonProgress.seasons[i];
        const filledClass =
          segment.kind === "filled" && entry && isCaughtUpWaiting(entry)
            ? CAUGHT_UP_BEAD
            : colorClass;
        return (
          <View
            key={key}
            className={cn(
              "shrink-0 rounded-full",
              SQUARE_SIZE[size],
              segment.kind === "filled" ? filledClass : "bg-white/10",
            )}
          />
        );
      })}
    </View>
  );
}
