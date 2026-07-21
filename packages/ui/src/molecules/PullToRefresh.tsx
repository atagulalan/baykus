/// <reference types="nativewind/types" />
import type { ReactNode } from "react";
import { RefreshControl, ScrollView, type ScrollViewProps } from "react-native";
import { colors } from "../tokens.ts";

export type PullToRefreshProps = ScrollViewProps & {
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
  children: ReactNode;
};

/** Native pull-to-refresh wrapper (RefreshControl). */
export function PullToRefresh({
  refreshing,
  onRefresh,
  children,
  style,
  contentContainerStyle,
  ...scrollProps
}: PullToRefreshProps) {
  return (
    <ScrollView
      {...scrollProps}
      style={[{ flex: 1 }, style]}
      contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void onRefresh();
          }}
          tintColor={colors.yellow}
          colors={[colors.yellow]}
        />
      }
    >
      {children}
    </ScrollView>
  );
}
