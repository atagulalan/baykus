/// <reference types="nativewind/types" />
import type { ReactNode } from "react";
import { Text } from "react-native";
import { cn } from "../lib/cn.ts";

export type PageTitleProps = {
  children: ReactNode;
  className?: string;
};

/** Shared typography for top-level page headings. */
export function PageTitle({ children, className }: PageTitleProps) {
  return (
    <Text className={cn("font-display text-2xl italic tracking-tight text-snow", className)}>
      {children}
    </Text>
  );
}
