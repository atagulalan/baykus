/// <reference types="nativewind/types" />
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { EpisodeLabel } from "../atoms/EpisodeLabel.tsx";
import { MediaImage } from "../atoms/MediaImage.tsx";
import {
  RatingControl,
  type RatingControlLabels,
  type RatingValue,
} from "../atoms/RatingControl.tsx";
import { cn } from "../lib/cn.ts";
import { Modal } from "./Modal.tsx";

export type EpisodeDetailsSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  s: number;
  e: number;
  episodeTitle: string | null;
  overview?: string | null;
  stillUrl?: string | null;
  seriesTitle?: string | null;
  airDate?: string | null;
  runtimeMin?: number | null;
  watched?: boolean;
  lastWatchedAt?: string | null;
  myRating?: RatingValue | null;
  ratingLabels?: RatingControlLabels;
  onRate?: (value: RatingValue | null) => void;
  onToggleWatch?: () => void;
  toggleLabel?: string;
  className?: string;
};

/** Dense episode details — native Modal port of web EpisodeDetailsModal (subset). */
export function EpisodeDetailsSheet({
  isOpen,
  onClose,
  s,
  e,
  episodeTitle,
  overview,
  stillUrl,
  seriesTitle,
  airDate,
  runtimeMin,
  watched = false,
  lastWatchedAt,
  myRating = null,
  ratingLabels,
  onRate,
  onToggleWatch,
  toggleLabel,
  className,
}: EpisodeDetailsSheetProps) {
  const { width, height } = useWindowDimensions();
  // Tablet/wide: cap still so it doesn't eat the sheet; keep 16:9 within that box.
  const stillMaxH = Math.min(240, Math.round(height * 0.28));
  const stillWidth = Math.min(width - 32, Math.round(stillMaxH * (16 / 9)));
  const stillHeight = Math.round(stillWidth * (9 / 16));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={episodeTitle ?? `S${s}E${e}`}
      className={cn("gap-3 px-4 pb-8 pt-3", className)}
    >
      {stillUrl ? (
        <View
          className="self-center overflow-hidden rounded-lg bg-white/5"
          style={{ width: stillWidth, height: stillHeight }}
        >
          <MediaImage
            src={stillUrl}
            accessibilityLabel={episodeTitle ?? "Episode still"}
            fill
            resizeMode="cover"
          />
        </View>
      ) : null}

      {seriesTitle ? (
        <Text className="font-display text-lg italic text-snow">{seriesTitle}</Text>
      ) : null}

      <View className="flex-row flex-wrap items-center gap-2">
        <EpisodeLabel s={s} e={e} format="SxEy" className="text-muted" />
        {airDate ? <Text className="font-mono text-xs text-muted">{airDate}</Text> : null}
        {runtimeMin != null ? (
          <Text className="font-mono text-xs text-muted">{runtimeMin} min</Text>
        ) : null}
      </View>

      {overview !== undefined ? (
        overview ? (
          <Text className="text-sm leading-5 text-snow/80">{overview}</Text>
        ) : (
          <Text className="font-mono text-xs text-muted">No overview</Text>
        )
      ) : null}

      {lastWatchedAt ? (
        <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Watched {new Date(lastWatchedAt).toLocaleString()}
        </Text>
      ) : null}

      {ratingLabels && onRate ? (
        <RatingControl value={myRating} onChange={onRate} labels={ratingLabels} size="sm" />
      ) : null}

      {onToggleWatch && toggleLabel ? (
        <Pressable
          accessibilityRole="button"
          onPress={onToggleWatch}
          className="self-start rounded-full border border-yellow/40 px-3 py-2 active:bg-yellow/10"
        >
          <Text className="font-mono text-[10px] uppercase tracking-widest text-yellow">
            {toggleLabel}
            {watched ? " · watched" : ""}
          </Text>
        </Pressable>
      ) : null}
    </Modal>
  );
}
