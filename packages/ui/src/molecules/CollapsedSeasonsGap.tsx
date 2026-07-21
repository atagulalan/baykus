/// <reference types="nativewind/types" />
import { Text, View } from "react-native";
import { CircularProgress } from "../atoms/CircularProgress.tsx";
import { SectionPill } from "../atoms/SectionPill.tsx";
import { cn } from "../lib/cn.ts";
import { SEASON_PILL_SIZE, SEASON_PROGRESS_SIZE } from "./SectionHeader.tsx";

export type CollapsedSeasonsGapProps = {
  /** How many fully-watched seasons are hidden behind this control. */
  count: number;
  /** Already-translated label, e.g. i18n `series.hiddenSeasonsWatched`. */
  label: string;
  onExpand: () => void;
  className?: string;
};

/** E165: pill that reveals fully-watched seasons before the active one. */
export function CollapsedSeasonsGap({
  count,
  label,
  onExpand,
  className,
}: CollapsedSeasonsGapProps) {
  if (count <= 0) return null;

  return (
    <View className={cn("flex-row items-center justify-center py-3", className)}>
      <SectionPill
        className="shrink"
        style={{ height: SEASON_PILL_SIZE }}
        onPress={onExpand}
      >
        <View className="h-full flex-row items-center">
          <View
            className="shrink-0 items-center justify-center"
            style={{ width: SEASON_PILL_SIZE, height: SEASON_PILL_SIZE }}
          >
            <CircularProgress size={SEASON_PROGRESS_SIZE} value={100} complete />
          </View>
          <Text className="pr-3 text-base font-semibold text-snow">{label}</Text>
        </View>
      </SectionPill>
    </View>
  );
}
