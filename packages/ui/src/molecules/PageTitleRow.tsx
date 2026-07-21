/// <reference types="nativewind/types" />
import type { ReactNode } from "react";
import { View } from "react-native";
import { PageTitle } from "../atoms/PageTitle.tsx";
import { cn } from "../lib/cn.ts";

export type PageTitleRowProps = {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Title + trailing action slot (desktop chrome; optional on phone). */
export function PageTitleRow({ children, action, className }: PageTitleRowProps) {
  return (
    <View className={cn("w-full flex-row items-center justify-between gap-3", className)}>
      <View className="min-w-0 flex-1">
        <PageTitle>{children}</PageTitle>
      </View>
      {action ? <View className="shrink-0">{action}</View> : null}
    </View>
  );
}
