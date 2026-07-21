/// <reference types="nativewind/types" />
import { TriangleAlert } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { borders } from "../lib/borders.ts";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";

export type NeedsReviewBannerProps = {
  title: string;
  description: string;
  fillLabel: string;
  dismissLabel: string;
  onFill: () => void;
  onDismiss: () => void;
  isLoading?: boolean;
  className?: string;
};

/** Banner for series stuck in needs_review — fill gaps or dismiss. Square chrome like web. */
export function NeedsReviewBanner({
  title,
  description,
  fillLabel,
  dismissLabel,
  onFill,
  onDismiss,
  isLoading = false,
  className,
}: NeedsReviewBannerProps) {
  return (
    <View className={cn("gap-3 bg-[#1a1a00] p-4", className)} style={borders.yellowSoft}>
      <View className="flex-row items-center gap-2">
        <TriangleAlert size={18} color={colors.yellow} />
        <Text className="font-display text-lg italic text-yellow">{title}</Text>
      </View>
      <Text className="text-sm text-snow/80">{description}</Text>
      <View className="mt-1 flex-row flex-wrap items-center gap-3">
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={onFill}
          className="bg-yellow px-4 py-2 active:opacity-90 disabled:opacity-50"
        >
          {isLoading ? (
            <ActivityIndicator color={colors.void} size="small" />
          ) : (
            <Text className="font-mono text-[10px] uppercase tracking-widest text-void">
              {fillLabel}
            </Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={onDismiss}
          className="bg-white/5 px-4 py-2 active:bg-white/10 disabled:opacity-50"
        >
          <Text className="font-mono text-[10px] uppercase tracking-widest text-snow">
            {dismissLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
