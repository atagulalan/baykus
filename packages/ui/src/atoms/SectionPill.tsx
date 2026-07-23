/// <reference types="nativewind/types" />
import type { ReactNode } from "react";
import { Pressable, type StyleProp, Text, View, type ViewStyle } from "react-native";
import { borders } from "../lib/borders.ts";
import { cn } from "../lib/cn.ts";

const PILL_BASE =
  "max-w-full min-h-7 shrink flex-row items-center gap-1.5 self-center rounded-full bg-void/95 px-0 py-0";

export type SectionPillProps = {
  children: ReactNode;
  className?: string;
  onPress?: (() => void) | undefined;
  style?: StyleProp<ViewStyle>;
};

/** Shared rounded pill chrome for sticky section titles. */
export function SectionPill({ children, className, onPress, style }: SectionPillProps) {
  const content =
    typeof children === "string" || typeof children === "number" ? (
      <Text className="px-2.5 py-1 font-mono text-xs uppercase tracking-widest text-snow">
        {children}
      </Text>
    ) : (
      children
    );

  // `borders.subtle` last so caller height/padding can't drop the stroke.
  const pillStyle = [style, borders.subtle];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className={cn(PILL_BASE, "active:bg-white/5", className)}
        style={pillStyle}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessibilityRole="header" className={cn(PILL_BASE, className)} style={pillStyle}>
      {content}
    </View>
  );
}
