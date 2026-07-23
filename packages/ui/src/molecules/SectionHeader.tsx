/// <reference types="nativewind/types" />
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { SectionPill } from "../atoms/SectionPill.tsx";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";

/**
 * Season accordion pill height. Progress ring sits inset; hit target is 1:1 at this size.
 */
export const SEASON_PILL_SIZE = 40;
/** CircularProgress diameter — smaller than the pill, centered in the leading slot. */
export const SEASON_PROGRESS_SIZE = 20;

export type SectionHeaderProps = {
  icon?: LucideIcon;
  leading?: ReactNode;
  label: string;
  count?: number | string;
  onPress?: () => void;
  expanded?: boolean;
  action?: ReactNode;
  className?: string;
};

/**
 * Section title pill — web parity: semibold label · | · mono count.
 * Sticky docking is owned by `StickySectionScroll` (floating pin under chrome).
 */
export function SectionHeader({
  icon: Icon,
  leading,
  label,
  count,
  onPress,
  expanded,
  action,
  className,
}: SectionHeaderProps) {
  const labelText = (
    <>
      <Text
        className={cn("min-w-0 shrink font-semibold text-snow", leading ? "text-base" : "text-sm")}
        numberOfLines={1}
      >
        {label}
      </Text>
      {count !== undefined ? (
        <>
          <Text className="shrink-0 text-muted/35" accessibilityElementsHidden>
            |
          </Text>
          <Text
            className={cn(
              "shrink-0 font-mono tabular-nums text-muted",
              leading ? "text-sm" : "text-xs",
            )}
          >
            {count}
          </Text>
        </>
      ) : null}
    </>
  );

  const body = onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityState={expanded !== undefined ? { expanded: expanded } : undefined}
      onPress={onPress}
      className={cn(
        "min-w-0 flex-row items-center gap-1.5 rounded-full active:bg-white/5",
        leading ? "h-full py-0 pl-0 pr-3" : "px-2.5 py-1",
      )}
    >
      {leading ? null : Icon ? <Icon size={14} color={colors.muted} strokeWidth={1.75} /> : null}
      {labelText}
    </Pressable>
  ) : (
    <View
      className={cn(
        "min-w-0 flex-row items-center gap-1.5",
        leading ? "h-full pr-3" : "px-2.5 py-1",
      )}
    >
      {leading ? null : Icon ? <Icon size={14} color={colors.muted} strokeWidth={1.75} /> : null}
      {labelText}
    </View>
  );

  return (
    <View
      collapsable={false}
      pointerEvents="box-none"
      className={cn("w-full flex-row items-center justify-center gap-1 py-1", className)}
    >
      <SectionPill className="shrink" style={leading ? { height: SEASON_PILL_SIZE } : undefined}>
        <View className={cn("flex-row items-center", leading ? "h-full" : undefined)}>
          {leading ? (
            <View
              className="shrink-0 items-center justify-center"
              style={{ width: SEASON_PILL_SIZE, height: SEASON_PILL_SIZE }}
            >
              {leading}
            </View>
          ) : null}
          {body}
        </View>
      </SectionPill>
      {action}
    </View>
  );
}
