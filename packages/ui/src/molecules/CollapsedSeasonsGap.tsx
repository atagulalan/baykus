/// <reference types="nativewind/types" />
import { Text, View } from "react-native";
import { CircularProgress } from "../atoms/CircularProgress.tsx";
import { SectionPill } from "../atoms/SectionPill.tsx";
import { cn } from "../lib/cn.ts";

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
    <View className={cn("flex-row items-center justify-center py-1", className)}>
      <SectionPill onPress={onExpand}>
        <View className="flex-row items-center gap-1.5">
          <CircularProgress value={100} complete />
          <Text className="text-sm font-semibold text-snow">{label}</Text>
        </View>
      </SectionPill>
    </View>
  );
}
