/// <reference types="nativewind/types" />
import { ArrowDown, ArrowUp, Minus } from "lucide-react-native";
import { forwardRef, useState } from "react";
import { Pressable, Text, View, type ViewProps } from "react-native";
import { MediaImage } from "../atoms/MediaImage.tsx";
import { SegmentedProgress } from "../atoms/SegmentedProgress.tsx";
import { CATEGORY_BG_COLORS, type WatchCategory } from "../lib/categoryColors.ts";
import { cn } from "../lib/cn.ts";
import { haptic } from "../lib/haptics.ts";
import type { SeasonProgress } from "../lib/progressSegments.ts";
import { colors } from "../tokens.ts";

export type SeriesCardSeries = {
  id: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  category: WatchCategory;
  rating: 1 | 2 | 3 | null;
  progress: { watched: number; aired: number };
  seasonProgress: SeasonProgress;
};

export type SeriesCardProps = {
  series: SeriesCardSeries;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  /**
   * Non-interactive clone for LiftContextMenu preview (no press handlers).
   */
  preview?: boolean;
  /** Dim / hide the in-grid card while its lift menu is open. */
  lifted?: boolean;
  className?: string;
  style?: ViewProps["style"];
};

const RATING_ICONS = {
  1: { Icon: ArrowDown, color: "#ef4444" },
  2: { Icon: Minus, color: colors.yellow },
  3: { Icon: ArrowUp, color: "#22c55e" },
} as const;

const DEFAULT_LONG_PRESS_MS = 400;

function progressTextColor(category: WatchCategory, watched: number): string {
  if (watched === 0) return "text-muted";
  return CATEGORY_BG_COLORS[category].replace("bg-", "text-");
}

/**
 * Presentational series poster card.
 * Navigation / prefetch / view-transitions stay in the app shell.
 * Outer `View` holds the measure ref for LiftContextMenu.
 */
export const SeriesCard = forwardRef<View, SeriesCardProps>(function SeriesCard(
  {
    series,
    onPress,
    onLongPress,
    delayLongPress = DEFAULT_LONG_PRESS_MS,
    preview = false,
    lifted = false,
    className,
    style,
  },
  ref,
) {
  const [imageFailed, setImageFailed] = useState(false);
  const { watched, aired } = series.progress;
  const textColor = progressTextColor(series.category, watched);

  const body = (
    <>
      <View className="aspect-[2/3] w-full overflow-hidden rounded-md bg-white/5">
        {series.posterUrl && !imageFailed ? (
          <MediaImage
            src={series.posterUrl}
            accessibilityLabel={series.title}
            fill
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View className="h-full w-full items-center justify-center p-4">
            <Text className="text-center font-mono text-xs uppercase tracking-widest text-muted">
              {series.title}
            </Text>
          </View>
        )}
        {series.rating !== null ? (
          <View className="absolute left-1 top-1 bg-void/80 p-1">
            {(() => {
              const { Icon, color } = RATING_ICONS[series.rating];
              return <Icon size={14} color={color} />;
            })()}
          </View>
        ) : null}
      </View>
      <View className="w-full items-start gap-1 pt-2">
        <Text
          numberOfLines={1}
          className="w-full text-left font-display text-[1rem] italic leading-tight text-snow"
        >
          {series.title}
        </Text>
        <View className="w-full flex-row items-center justify-between">
          <Text className="font-mono text-[10px] tabular-nums tracking-wide text-muted">
            {series.year ?? "—"}
          </Text>
          <Text className={cn("font-mono text-[10px] tabular-nums tracking-wide", textColor)}>
            {watched} / {aired}
          </Text>
        </View>
        <SegmentedProgress
          seasonProgress={series.seasonProgress}
          watched={watched}
          aired={aired}
          category={series.category}
        />
      </View>
    </>
  );

  if (preview) {
    return (
      <View ref={ref} className={cn("flex-col rounded-md px-1.5 py-1.5", className)} style={style}>
        {body}
      </View>
    );
  }

  return (
    <View
      ref={ref}
      collapsable={false}
      className={cn(lifted && "opacity-0", className)}
      style={style}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={series.title}
        onPress={
          onPress
            ? () => {
                haptic("selection");
                onPress();
              }
            : undefined
        }
        {...(onLongPress !== undefined ? { onLongPress, delayLongPress } : {})}
        className="flex-col rounded-md px-1.5 py-1.5 active:bg-white/5"
      >
        {body}
      </Pressable>
    </View>
  );
});
