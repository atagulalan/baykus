/// <reference types="nativewind/types" />
import { ArrowDown, ArrowUp, Minus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MediaImage } from "../atoms/MediaImage.tsx";
import { SegmentedProgress } from "../atoms/SegmentedProgress.tsx";
import { CATEGORY_BG_COLORS, type WatchCategory } from "../lib/categoryColors.ts";
import { cn } from "../lib/cn.ts";
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
  onPress: () => void;
};

const RATING_ICONS = {
  1: { Icon: ArrowDown, color: "#ef4444" },
  2: { Icon: Minus, color: colors.yellow },
  3: { Icon: ArrowUp, color: "#22c55e" },
} as const;

function progressTextColor(category: WatchCategory, watched: number): string {
  if (watched === 0) return "text-muted";
  return CATEGORY_BG_COLORS[category].replace("bg-", "text-");
}

/**
 * Presentational series poster card.
 * Navigation / prefetch / view-transitions stay in the app shell.
 */
export function SeriesCard({ series, onPress }: SeriesCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const { watched, aired } = series.progress;
  const textColor = progressTextColor(series.category, watched);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={series.title}
      onPress={onPress}
      className="flex-col rounded-md px-1.5 py-1.5 active:bg-white/5"
    >
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
    </Pressable>
  );
}
