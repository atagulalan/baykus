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
  ...scrollProps
}: PullToRefreshProps) {
  return (
    <ScrollView
      {...scrollProps}
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
