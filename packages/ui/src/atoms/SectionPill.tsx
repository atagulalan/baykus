/// <reference types="nativewind/types" />
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../lib/cn.ts";

const PILL_BASE =
  "max-w-full min-h-7 flex-row items-center gap-1.5 rounded-full border border-white/10 bg-void/95 px-2.5 py-0";

export type SectionPillProps = {
  children: ReactNode;
  className?: string;
  onPress?: (() => void) | undefined;
};

/** Shared rounded pill chrome for sticky section titles. */
export function SectionPill({ children, className, onPress }: SectionPillProps) {
  const content =
    typeof children === "string" || typeof children === "number" ? (
      <Text className="font-mono text-xs uppercase tracking-widest text-snow">{children}</Text>
    ) : (
      children
    );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="header"
        onPress={onPress}
        className={cn(PILL_BASE, "active:bg-white/5", className)}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessibilityRole="header" className={cn(PILL_BASE, className)}>
      {content}
    </View>
  );
}
