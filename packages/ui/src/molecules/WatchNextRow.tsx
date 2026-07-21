/// <reference types="nativewind/types" />
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Checkbox } from "../atoms/Checkbox.tsx";
import { EpisodeLabel } from "../atoms/EpisodeLabel.tsx";
import { MediaImage } from "../atoms/MediaImage.tsx";
import type { WatchCategory } from "../lib/categoryColors.ts";
import { cn } from "../lib/cn.ts";
import type { SeasonProgress } from "../lib/progressSegments.ts";
import { computeOverflowBadge, shouldShowQuickMarkCheckbox } from "../lib/watchNext.ts";

export type WatchNextSeries = {
  id: number;
  title: string;
  posterUrl: string | null;
  category: WatchCategory;
  progress: { watched: number; aired: number; total: number };
  seasonProgress: SeasonProgress;
  nextAirDate: string | null;
  nextUnwatched: {
    episodeId: number;
    s: number;
    e: number;
    title: string | null;
    airDate: string | null;
    airStamp: string | null;
    stillUrl?: string | null;
  } | null;
};

export type WatchNextRowProps = {
  series: WatchNextSeries;
  onPress: () => void;
  onQuickMark: (episodeId: number) => void;
  /** Translated subtitle when caught up (next air / up to date). */
  caughtUpSubtitle: string;
  marking?: boolean;
  className?: string;
};

/** Match EpisodeRow / web w-12 rail — fixed px so Image cannot expand to intrinsic height. */
const POSTER_W = 48;
const POSTER_H = 72;

function Poster({
  url,
  label,
  failed,
  onError,
}: {
  url: string | null;
  label: string;
  failed?: boolean;
  onError?: () => void;
}) {
  return (
    <View
      className="shrink-0 overflow-hidden rounded-md bg-white/5"
      style={{ width: POSTER_W, height: POSTER_H }}
    >
      {url && !failed ? (
        <MediaImage
          src={url}
          accessibilityLabel={label}
          wrapperClassName="h-full w-full"
          className="h-full w-full"
          style={{ width: POSTER_W, height: POSTER_H }}
          {...(onError ? { onError } : {})}
        />
      ) : null}
    </View>
  );
}

function CaughtUpWatchRow({
  series,
  onPress,
  subtitle,
  className,
}: {
  series: WatchNextSeries;
  onPress: () => void;
  subtitle: string;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        "min-w-0 flex-row items-center gap-0 border-b border-white/5 py-2 pl-3 pr-3 active:bg-white/5",
        className,
      )}
    >
      <Poster
        url={series.posterUrl}
        label={series.title}
        failed={imageFailed}
        onError={() => setImageFailed(true)}
      />
      <View className="min-w-0 flex-1 justify-center gap-0.5 overflow-hidden py-1 pl-4">
        <Text numberOfLines={1} className="font-display text-base italic text-snow">
          {series.title}
        </Text>
        <Text numberOfLines={1} className="font-mono text-xs text-muted">
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

/** One row in a Watch list — next episode chrome or caught-up fallback. */
export function WatchNextRow({
  series,
  onPress,
  onQuickMark,
  caughtUpSubtitle,
  marking = false,
  className,
}: WatchNextRowProps) {
  const next = series.nextUnwatched;
  if (!next) {
    return (
      <CaughtUpWatchRow
        series={series}
        onPress={onPress}
        subtitle={caughtUpSubtitle}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  const overflow = computeOverflowBadge(series.progress);
  const showCheckbox = shouldShowQuickMarkCheckbox(next);

  return (
    <View
      className={cn(
        "min-w-0 flex-row items-center border-b border-white/5 py-2 pl-3 pr-3",
        className,
      )}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="min-w-0 flex-1 flex-row items-center active:opacity-90"
      >
        <Poster url={series.posterUrl} label={series.title} />
        <View className="min-w-0 flex-1 justify-center gap-1 py-1 pl-4 pr-2">
          <Text numberOfLines={1} className="font-display text-base italic text-snow">
            {series.title}
          </Text>
          <View className="flex-row flex-wrap items-center gap-2">
            <EpisodeLabel s={next.s} e={next.e} format="SxEy" className="text-muted" />
            {overflow > 0 ? (
              <Text className="font-mono text-[10px] text-muted">+{overflow}</Text>
            ) : null}
          </View>
          {next.title ? (
            <Text numberOfLines={1} className="text-sm text-snow">
              {next.title}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {showCheckbox ? (
        <View className="h-11 w-11 shrink-0 items-center justify-center">
          <Checkbox
            checked={marking}
            disabled={marking}
            variant="rounded"
            onChange={() => {
              if (!marking) onQuickMark(next.episodeId);
            }}
            accessibilityLabel="Mark watched"
          />
        </View>
      ) : null}
    </View>
  );
}

export { computeOverflowBadge, shouldShowQuickMarkCheckbox };
