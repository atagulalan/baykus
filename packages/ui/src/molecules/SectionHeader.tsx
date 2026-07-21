/// <reference types="nativewind/types" />
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
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

/** Section title pill with optional count / collapse toggle. Sticky is owned by the list. */
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
  const body = (
    <>
      {leading}
      {Icon ? <Icon size={14} color={colors.muted} /> : null}
      <Text className="font-mono text-xs uppercase tracking-widest text-snow" numberOfLines={1}>
        {label}
      </Text>
      {count !== undefined ? (
        <Text className="font-mono text-[10px] text-muted">{count}</Text>
      ) : null}
    </>
  );

  return (
    <View className={cn("flex-row items-center justify-center gap-2 py-1", className)}>
      <SectionPill onPress={onPress}>
        <View className="flex-row items-center gap-1.5">
          {body}
          {expanded !== undefined ? (
            <Text className="font-mono text-[10px] text-muted">{expanded ? "−" : "+"}</Text>
          ) : null}
        </View>
      </SectionPill>
      {action}
    </View>
  );
}
