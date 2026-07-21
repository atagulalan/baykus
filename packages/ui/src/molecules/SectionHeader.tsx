/// <reference types="nativewind/types" />
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { SectionPill } from "../atoms/SectionPill.tsx";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";

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
 * Sticky is owned by the list.
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
      <Text className="min-w-0 shrink font-semibold text-sm text-snow" numberOfLines={1}>
        {label}
      </Text>
      {count !== undefined ? (
        <>
          <Text className="shrink-0 text-muted/35" accessibilityElementsHidden>
            |
          </Text>
          <Text className="shrink-0 font-mono text-xs tabular-nums text-muted">{count}</Text>
        </>
      ) : null}
      {expanded !== undefined ? (
        <Text className="font-mono text-[10px] text-muted">{expanded ? "−" : "+"}</Text>
      ) : null}
    </>
  );

  const body = onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityState={expanded !== undefined ? { expanded } : undefined}
      onPress={onPress}
      className={cn(
        "min-w-0 flex-1 flex-row items-center gap-1.5 rounded-full py-1 active:bg-white/5",
        leading ? "-ml-4 -mr-2.5 pl-3 pr-2.5" : "-mx-2.5 px-2.5",
      )}
    >
      {leading ? null : Icon ? <Icon size={14} color={colors.muted} strokeWidth={1.75} /> : null}
      {labelText}
    </Pressable>
  ) : (
    <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
      {leading ? null : Icon ? <Icon size={14} color={colors.muted} strokeWidth={1.75} /> : null}
      {labelText}
    </View>
  );

  return (
    <View className={cn("flex-row items-center justify-center gap-1 py-1", className)}>
      <SectionPill>
        <View className="flex-row items-center gap-0">
          {leading ? <View className="relative z-20 -ml-2.5 shrink-0">{leading}</View> : null}
          {body}
        </View>
      </SectionPill>
      {action}
    </View>
  );
}
