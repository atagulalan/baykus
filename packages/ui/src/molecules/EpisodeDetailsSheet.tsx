/// <reference types="nativewind/types" />
import { Check } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { AirDateLabel } from "../atoms/AirDateLabel.tsx";
import { CHECKBOX_ROUNDED_SIZE_PX } from "../atoms/Checkbox.tsx";
import { EpisodeLabel } from "../atoms/EpisodeLabel.tsx";
import { MediaImage } from "../atoms/MediaImage.tsx";
import {
  RatingControl,
  type RatingControlLabels,
  type RatingValue,
} from "../atoms/RatingControl.tsx";
import { Separator } from "../atoms/Separator.tsx";
import { borders } from "../lib/borders.ts";
import { cn } from "../lib/cn.ts";
import { formatEpisodeLabel } from "../lib/episodeLabel.ts";
import { haptic } from "../lib/haptics.ts";
import { colors } from "../tokens.ts";
import { Modal } from "./Modal.tsx";

/** Match rounded Checkbox tokens (episode row). */
const CHECK_GREEN_SOFT = "rgba(34, 197, 94, 0.12)";
const CHECK_GREEN = "#22c55e";

export type EpisodeDetailsSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Bottom-sheet header — e.g. t("episode.detailsTitle"). */
  title?: string;
  s: number;
  e: number;
  episodeTitle: string | null;
  overview?: string | null;
  stillUrl?: string | null;
  seriesTitle?: string | null;
  airDate?: string | null;
  /** Locale for air-date formatting (e.g. i18n.language). */
  locale?: string;
  /** Already-translated runtime, e.g. t("episode.runtimeMin"). */
  runtimeLabel?: string | null;
  watched?: boolean;
  lastWatchedAt?: string | null;
  myRating?: RatingValue | null;
  ratingLabels?: RatingControlLabels;
  onRate?: (value: RatingValue | null) => void;
  onToggleWatch?: () => void;
  /** Full action label — accessibility. */
  toggleLabel?: string;
  className?: string;
};

function EpisodeStillPanel({
  s,
  e,
  stillUrl,
  episodeTitle,
  width,
  height,
}: {
  s: number;
  e: number;
  stillUrl: string | null;
  episodeTitle: string | null;
  width: number;
  height: number;
}) {
  const [stillFailed, setStillFailed] = useState(false);
  const showStill = Boolean(stillUrl) && !stillFailed;
  const stillCode = formatEpisodeLabel(s, e, "SxEy");

  return (
    <View
      className="items-center justify-center self-center overflow-hidden rounded-lg bg-white/5"
      style={{ width, height }}
    >
      {showStill && stillUrl ? (
        <MediaImage
          src={stillUrl}
          accessibilityLabel={episodeTitle ?? "Episode still"}
          fill
          resizeMode="cover"
          onError={() => setStillFailed(true)}
        />
      ) : (
        <Text className="font-mono text-sm tabular-nums text-muted">{stillCode}</Text>
      )}
    </View>
  );
}

function WatchToggle({
  watched,
  toggleLabel,
  onToggleWatch,
}: {
  watched: boolean;
  toggleLabel: string;
  onToggleWatch: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={toggleLabel}
      onPress={() => {
        haptic("selection");
        onToggleWatch();
      }}
      className="shrink-0 items-center justify-center rounded-full active:opacity-80"
      style={{
        width: CHECKBOX_ROUNDED_SIZE_PX,
        height: CHECKBOX_ROUNDED_SIZE_PX,
        backgroundColor: watched ? CHECK_GREEN_SOFT : "transparent",
        ...(watched ? borders.none : borders.idle),
      }}
    >
      <View style={{ opacity: watched ? 1 : 0.2 }} pointerEvents="none">
        <Check size={20} strokeWidth={2} color={watched ? CHECK_GREEN : colors.muted} />
      </View>
    </Pressable>
  );
}

/** Dense episode details — native Modal port of web EpisodeDetailsModal (subset). */
export function EpisodeDetailsSheet({
  isOpen,
  onClose,
  title,
  s,
  e,
  episodeTitle,
  overview,
  stillUrl,
  seriesTitle,
  airDate,
  locale = "tr",
  runtimeLabel,
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
  const sheetTitle = title ?? "Episode Details";
  const showWatchToggle = Boolean(onToggleWatch && toggleLabel);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={sheetTitle}
      size="large"
      className={cn("gap-3 px-4 pb-8 pt-3", className)}
    >
      <EpisodeStillPanel
        key={stillUrl ?? ""}
        s={s}
        e={e}
        stillUrl={stillUrl ?? null}
        episodeTitle={episodeTitle}
        width={stillWidth}
        height={stillHeight}
      />

      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="font-display text-lg italic text-snow" numberOfLines={2}>
            {episodeTitle ?? formatEpisodeLabel(s, e, "SxEy")}
          </Text>
          {seriesTitle ? (
            <Text className="font-mono text-xs text-muted" numberOfLines={1}>
              {seriesTitle}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap items-center">
            <EpisodeLabel s={s} e={e} format="SxEy" className="text-muted" />
            {airDate ? (
              <>
                <Separator />
                <AirDateLabel airDate={airDate} locale={locale} />
              </>
            ) : null}
            {runtimeLabel ? (
              <>
                <Separator />
                <Text className="font-mono text-xs tabular-nums text-snow/80">{runtimeLabel}</Text>
              </>
            ) : null}
          </View>
        </View>
        {showWatchToggle && onToggleWatch && toggleLabel ? (
          <WatchToggle
            watched={watched}
            toggleLabel={toggleLabel}
            onToggleWatch={onToggleWatch}
          />
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
        <View className="items-center pt-2">
          <View>
            <RatingControl value={myRating} onChange={onRate} labels={ratingLabels} iconsOnly />
          </View>
        </View>
      ) : null}
    </Modal>
  );
}
