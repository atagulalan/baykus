/// <reference types="nativewind/types" />
import { type ReactNode, useState } from "react";
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from "react-native";
import { MediaImage } from "../atoms/MediaImage.tsx";
import { SegmentedProgress } from "../atoms/SegmentedProgress.tsx";
import { progressTextColor, type WatchCategory } from "../lib/categoryColors.ts";
import { cn } from "../lib/cn.ts";
import type { SeasonProgress } from "../lib/progressSegments.ts";
import { colors } from "../tokens.ts";
import { HeroBackdropFades } from "./HeroBackdropFades.tsx";

export type SeriesDetailHeroProps = {
  title: string;
  year?: number | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  category: WatchCategory;
  progress: { watched: number; aired: number };
  seasonProgress: SeasonProgress;
  /** Safe-area + nav header offset so content clears the transparent stack bar. */
  insetsTop?: number;
  /** Info / details sheet trigger. */
  onPressDetails?: () => void;
  detailsAccessibilityLabel?: string;
  detailsIcon?: ReactNode;
  /** Overflow / actions (⋮) — owned by the app shell. */
  menuSlot?: ReactNode;
  /** /series/new — CTA instead of library progress. */
  preview?: boolean;
  onStartWatching?: () => void;
  startWatchingLabel?: string;
  startWatchingPending?: boolean;
  className?: string;
};

const POSTER_W_NARROW = 112; // ~w-28
const POSTER_W_WIDE = 160; // ~w-40

/**
 * Full-bleed backdrop hero — native port of web SeriesDetailHero.
 * Poster + title row + SegmentedProgress (or start-watching CTA in preview).
 */
export function SeriesDetailHero({
  title,
  year = null,
  posterUrl = null,
  backdropUrl = null,
  category,
  progress,
  seasonProgress,
  insetsTop = 0,
  onPressDetails,
  detailsAccessibilityLabel = "Details",
  detailsIcon,
  menuSlot,
  preview = false,
  onStartWatching,
  startWatchingLabel = "Start watching",
  startWatchingPending = false,
  className,
}: SeriesDetailHeroProps) {
  const { width } = useWindowDimensions();
  const wide = width >= 640;
  const posterW = wide ? POSTER_W_WIDE : POSTER_W_NARROW;
  const posterH = Math.round(posterW * 1.5);
  const heroMinH = wide ? 480 : 384;
  const [heroH, setHeroH] = useState(heroMinH);
  const { watched, aired } = progress;
  const countClass = progressTextColor(category, watched);
  const fadeH = Math.max(heroH, heroMinH);

  return (
    <View
      className={cn("relative w-full bg-void", className)}
      style={{ minHeight: heroMinH }}
      onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        if (h > 0 && h !== heroH) setHeroH(h);
      }}
    >
      {/* Backdrop sized to the hero (not taller) so the bottom void fade isn't clipped mid-ramp. */}
      <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
        {backdropUrl ? (
          <MediaImage src={backdropUrl} accessibilityLabel="" fill resizeMode="cover" />
        ) : null}
        <HeroBackdropFades width={width} height={fadeH} sideFades={wide} />
      </View>

      <View
        className={cn("relative z-10 flex-row items-end px-3 pb-6", wide ? "gap-6 px-4" : "gap-4")}
        style={{
          minHeight: heroMinH,
          // Web: pt-20 / sm:pt-32 over transparent header; insetsTop already includes bar.
          paddingTop: insetsTop + (wide ? 32 : 16),
        }}
      >
        <View
          className="shrink-0 overflow-hidden rounded-md bg-white/5"
          style={{
            width: posterW,
            height: posterH,
            shadowColor: "#000",
            shadowOpacity: 0.45,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          {posterUrl ? (
            <MediaImage
              src={posterUrl}
              accessibilityLabel={title}
              style={{ width: posterW, height: posterH }}
            />
          ) : (
            <View className="h-full w-full items-center justify-center p-2">
              <Text className="text-center text-sm text-muted">{title}</Text>
            </View>
          )}
        </View>

        <View className="min-w-0 flex-1 gap-3 pb-1">
          <View className="flex-row items-start justify-between gap-2">
            <View className="min-w-0 flex-1">
              <Text
                numberOfLines={3}
                className={cn(
                  "font-display italic leading-none tracking-tight text-snow",
                  wide ? "text-4xl" : "text-2xl",
                )}
              >
                {title}
                {year != null ? (
                  <Text
                    className={cn(
                      "font-sans not-italic text-snow/60",
                      wide ? "text-2xl" : "text-base",
                    )}
                  >
                    {`  (${year})`}
                  </Text>
                ) : null}
              </Text>
            </View>
            <View className="shrink-0 flex-row items-center gap-1">
              {onPressDetails ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={detailsAccessibilityLabel}
                  onPress={onPressDetails}
                  hitSlop={8}
                  className="h-11 w-11 shrink-0 items-center justify-center active:opacity-70"
                >
                  {detailsIcon}
                </Pressable>
              ) : null}
              {menuSlot}
            </View>
          </View>

          {preview ? (
            <Pressable
              accessibilityRole="button"
              disabled={startWatchingPending || !onStartWatching}
              onPress={onStartWatching}
              className="mt-1 min-h-10 self-start items-center justify-center rounded-full bg-yellow px-5 py-2.5 active:opacity-90 disabled:opacity-50"
            >
              {startWatchingPending ? (
                <ActivityIndicator color={colors.void} />
              ) : (
                <Text className="font-mono text-[10px] uppercase tracking-widest text-void">
                  {startWatchingLabel}
                </Text>
              )}
            </Pressable>
          ) : (
            <View className="mt-2 max-w-sm gap-1">
              <SegmentedProgress
                seasonProgress={seasonProgress}
                watched={watched}
                aired={aired}
                category={category}
                size="md"
              />
              <Text className={cn("font-mono text-sm tabular-nums", countClass)}>
                {watched}/{aired}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
