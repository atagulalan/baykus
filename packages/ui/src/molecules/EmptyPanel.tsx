/// <reference types="nativewind/types" />
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";

export type EmptyPanelProps = {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
};

/** Soft page-level empty — icon ring + display title + mono hint + optional CTA. */
export function EmptyPanel({ icon: Icon, title, hint, action, className }: EmptyPanelProps) {
  return (
    <View className={cn("mt-4 items-center gap-5 px-3 py-16", className)}>
      <View className="h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Icon size={22} strokeWidth={1.5} color={colors.muted} />
      </View>
      <View className="items-center gap-2">
        <Text className="text-center font-display text-3xl italic tracking-tight text-snow">
          {title}
        </Text>
        {hint ? (
          <Text className="max-w-[18rem] text-center font-mono text-xs text-muted">{hint}</Text>
        ) : null}
      </View>
      {action ? <View className="items-center pt-1">{action}</View> : null}
    </View>
  );
}

/** Yellow pill CTA shared with calendar empty / start-watching. */
export const EMPTY_PANEL_CTA_CLASS =
  "min-h-10 flex-row items-center gap-2 rounded-full bg-yellow px-5 py-2.5";
