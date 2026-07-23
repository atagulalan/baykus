/// <reference types="nativewind/types" />
import { type ReactNode, type Ref, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Checkbox } from "../atoms/Checkbox.tsx";
import { EpisodeLabel } from "../atoms/EpisodeLabel.tsx";
import { MediaImage } from "../atoms/MediaImage.tsx";
import {
  RatingControl,
  type RatingControlLabels,
  type RatingValue,
} from "../atoms/RatingControl.tsx";
import { borders } from "../lib/borders.ts";
import { cn } from "../lib/cn.ts";
import type { EpisodeLabelFormat } from "../lib/episodeLabel.ts";
import { formatEpisodeLabel } from "../lib/episodeLabel.ts";
import type { EpisodeType } from "../lib/episodeTags.ts";
import { TAG_BORDERS } from "../lib/episodeTags.ts";
import { haptic } from "../lib/haptics.ts";
import { EpisodeTags, type EpisodeTagsProps } from "../molecules/EpisodeTags.tsx";

export type EpisodeRowProps = {
  s: number;
  e: number;
  episodeTitle: string | null;
  /** Still / poster image URL. */
  stillUrl?: string | null;
  labelFormat?: EpisodeLabelFormat;
  watched: boolean;
  muted?: boolean;
  checkboxDisabled?: boolean;
  onToggleWatch?: () => void;
  tags?: Omit<EpisodeTagsProps, "s" | "e"> | null;
  /** Force tags on/off; default = series chrome only (web). */
  showTags?: boolean;
  onPress?: () => void;
  className?: string;
  /** History / cross-series chrome: italic series title as primary. */
  seriesTitle?: string | null;
  /** Edge-to-edge poster rail (web `posterStretch`). */
  posterStretch?: boolean;
  /** Skip bottom hairline (web `embedded`). */
  embedded?: boolean;
  /** Season-list text alignment (NextUpCard uses center). */
  align?: "start" | "center";
  /** Trailing meta (e.g. relative watch day). */
  trailing?: ReactNode;
  /** Rewatch count badge when > 1 (web ×N). */
  watchCount?: number;
  /** Formatted air date for season-list meta (`SxE – date`). */
  airDateLabel?: string | null;
  episodeType?: EpisodeType | null;
  finaleLabel?: string;
  untitledLabel?: string;
  /** 011 E150 — show post-watch rating control beside the checkbox. */
  showRatingPrompt?: boolean;
  myRating?: RatingValue | null;
  ratingLabels?: RatingControlLabels;
  skipLabel?: string;
  onRate?: (value: RatingValue) => void;
  onDismissPrompt?: () => void;
  /** Watch control wrapper — tablet ActionSheet popover anchor. */
  watchControlRef?: Ref<View>;
};

/** Season still — web `h-12 w-20`. */
const STILL_W = 80;
const STILL_H = 48;
/** Series chrome poster — web `h-12 w-8`. */
const POSTER_W = 48;
const POSTER_H = 56;

/** Reserved still frame with centered S{n}E{m} when missing/failed (amends E148). */
function EpisodeStillFrame(props: {
  s: number;
  e: number;
  stillUrl?: string | null;
  accessibilityLabel: string;
}) {
  return <EpisodeStillFrameInner key={props.stillUrl ?? ""} {...props} />;
}

function EpisodeStillFrameInner({
  s,
  e,
  stillUrl,
  accessibilityLabel,
}: {
  s: number;
  e: number;
  stillUrl?: string | null;
  accessibilityLabel: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(stillUrl) && !failed;
  const code = formatEpisodeLabel(s, e, "SxEy");

  return (
    <View
      className="shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/5"
      style={{ width: STILL_W, height: STILL_H }}
    >
      {showImage && stillUrl ? (
        <MediaImage
          src={stillUrl}
          accessibilityLabel={accessibilityLabel}
          wrapperClassName="h-full w-full"
          className="h-full w-full opacity-90"
          style={{ width: STILL_W, height: STILL_H }}
          showLoader={false}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text className="font-mono text-[10px] tabular-nums text-muted">{code}</Text>
      )}
    </View>
  );
}

/**
 * Episode list row for calendar / watch / series detail / history.
 *
 * Layout: outer `View` so row navigation and checkbox/rating are separate
 * press targets (nested Pressable was eating checkbox taps / double-firing).
 */
export function EpisodeRow({
  s,
  e,
  episodeTitle,
  stillUrl,
  labelFormat = "SxEy",
  watched,
  muted = false,
  checkboxDisabled = false,
  onToggleWatch,
  tags,
  showTags,
  onPress,
  className,
  seriesTitle = null,
  posterStretch = false,
  embedded = false,
  align = "start",
  trailing,
  watchCount = 0,
  airDateLabel = null,
  episodeType = null,
  finaleLabel = "Finale",
  untitledLabel = "Untitled",
  showRatingPrompt = false,
  myRating = null,
  ratingLabels,
  skipLabel = "skip",
  onRate,
  onDismissPrompt,
  watchControlRef,
}: EpisodeRowProps) {
  const hasSeriesChrome = seriesTitle != null;
  const stretchPoster = posterStretch && hasSeriesChrome;
  const tagsVisible = showTags ?? hasSeriesChrome;
  const centered = align === "center";
  const rewatched = watchCount > 1;
  const showPrompt = Boolean(showRatingPrompt && ratingLabels && onRate && onDismissPrompt);
  const promptLabels = ratingLabels;
  const displayTitle = episodeTitle ?? untitledLabel;

  const thumb = hasSeriesChrome ? (
    <View
      className="shrink-0 overflow-hidden rounded-md bg-white/5"
      style={
        stretchPoster
          ? // Stretch to row height (web `self-stretch`). Image must `fill` —
            // percentage/flex height lets RN Image intrinsic bitmap explode the row.
            { width: POSTER_W, alignSelf: "stretch", minHeight: POSTER_H }
          : { width: POSTER_W, height: POSTER_H }
      }
    >
      {stillUrl ? (
        <MediaImage
          src={stillUrl}
          accessibilityLabel={seriesTitle ?? displayTitle}
          fill={stretchPoster}
          wrapperClassName={stretchPoster ? undefined : "h-full w-full"}
          className="h-full w-full"
          style={stretchPoster ? undefined : { width: POSTER_W, height: POSTER_H }}
          showLoader={false}
        />
      ) : null}
    </View>
  ) : (
    <EpisodeStillFrame s={s} e={e} stillUrl={stillUrl ?? null} accessibilityLabel={displayTitle} />
  );

  const seasonPrimary = (
    <View
      className={cn(
        "min-w-0 items-center gap-2",
        // Centered (NextUpCard): column + hug content like web — no flex-1
        // so the card shell can stay `w-auto`. `shrink` is required on RN
        // (default flexShrink is 0) so long titles can compress and truncate.
        centered ? "shrink flex-col justify-center" : "flex-1 flex-row",
      )}
    >
      <View className={cn("min-w-0 overflow-hidden", centered ? "w-full shrink" : "flex-1")}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className={cn(
            "min-w-0 shrink font-display text-base italic",
            muted ? "text-muted-dim" : "text-snow",
            centered && "text-center",
          )}
        >
          {displayTitle}
        </Text>
        <Text
          numberOfLines={1}
          className={cn("mt-0.5 font-mono text-xs text-muted", centered && "text-center")}
        >
          {formatEpisodeLabel(s, e, labelFormat)}
          {airDateLabel ? (
            <>
              <Text className="text-muted-dim">{" – "}</Text>
              <Text className="tabular-nums text-snow/70">{airDateLabel}</Text>
            </>
          ) : null}
        </Text>
      </View>
      {episodeType === "finale" ? (
        <View
          className="shrink-0 items-center justify-center rounded-full bg-red-400/10 px-2 py-0.5"
          style={TAG_BORDERS.finale}
        >
          <Text className="font-mono text-[9px] uppercase tracking-wide text-red-300/90">
            {finaleLabel}
          </Text>
        </View>
      ) : null}
      {centered && tagsVisible && tags ? <EpisodeTags s={s} e={e} {...tags} /> : null}
    </View>
  );

  const seriesPrimary = (
    <View
      className={cn(
        "min-w-0 flex-1 justify-center gap-0.5 overflow-hidden",
        stretchPoster ? "py-2 pl-2 pr-0" : "py-2 pl-4 pr-2",
      )}
    >
      <Text
        numberOfLines={1}
        className={cn("font-display text-base italic", muted ? "text-muted-dim" : "text-snow")}
      >
        {seriesTitle}
      </Text>
      <View className="flex-row flex-wrap items-center gap-2">
        <EpisodeLabel s={s} e={e} format={labelFormat} className="text-muted" />
        {episodeTitle ? (
          <Text numberOfLines={1} className="min-w-0 flex-1 font-mono text-xs text-muted-dim">
            {episodeTitle}
          </Text>
        ) : null}
        {tagsVisible && tags ? <EpisodeTags s={s} e={e} {...tags} /> : null}
      </View>
    </View>
  );

  // Stretch mode still needs the poster beside the title block (web shell
  // renders poster outside `body`; RN keeps both inside the pressable).
  const body = hasSeriesChrome ? (
    <>
      {thumb}
      {seriesPrimary}
    </>
  ) : (
    <>
      {thumb}
      {seasonPrimary}
    </>
  );

  return (
    <View
      className={cn(
        "min-w-0 flex-row",
        stretchPoster ? "items-stretch gap-0 py-2 pl-3 pr-3" : "items-center gap-3 py-3 px-3",
        !embedded && "border-b border-white/5",
        muted && "opacity-50",
        centered && "max-w-full shrink justify-center",
        className,
      )}
    >
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptic("selection");
            onPress();
          }}
          className={cn(
            "min-w-0 flex-row gap-3",
            centered ? "w-auto max-w-full shrink" : "flex-1",
            stretchPoster ? "items-stretch gap-0" : "items-center",
          )}
        >
          {body}
        </Pressable>
      ) : (
        <View
          className={cn(
            "min-w-0 flex-row gap-3",
            centered ? "w-auto max-w-full shrink" : "flex-1",
            stretchPoster ? "items-stretch gap-0" : "items-center",
          )}
        >
          {body}
        </View>
      )}

      {tagsVisible && !hasSeriesChrome && !centered && tags ? (
        <EpisodeTags s={s} e={e} {...tags} />
      ) : null}

      {trailing ? <View className="justify-center pl-2 pr-3">{trailing}</View> : null}

      {onToggleWatch ? (
        <View
          ref={watchControlRef}
          collapsable={false}
          className="relative min-h-9 shrink-0 flex-row items-center justify-end"
        >
          {showPrompt && promptLabels && onRate && onDismissPrompt ? (
            <View className="mr-1 flex-row items-center gap-1.5">
              <RatingControl
                value={myRating}
                onChange={(value) => {
                  if (value !== null) onRate(value);
                }}
                labels={promptLabels}
                size="sm"
                iconsOnly
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={skipLabel}
                onPress={onDismissPrompt}
                className="rounded-full bg-void/95 px-2.5 py-1.5 active:bg-white/5"
                style={borders.subtle}
              >
                <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  {skipLabel}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {rewatched ? (
            <Pressable
              accessibilityRole="button"
              disabled={checkboxDisabled}
              onPress={() => {
                haptic("selection");
                onToggleWatch();
              }}
              className="h-9 min-w-9 items-center justify-center disabled:opacity-40"
            >
              <Text className="font-mono text-sm tabular-nums text-yellow">×{watchCount}</Text>
            </Pressable>
          ) : (
            <View className="h-9 w-9 items-center justify-center">
              <Checkbox
                checked={watched}
                onChange={() => onToggleWatch()}
                disabled={checkboxDisabled}
                variant="rounded"
                showHint
                accessibilityLabel="Toggle watched"
              />
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
