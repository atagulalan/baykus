/// <reference types="nativewind/types" />
import { Text } from "react-native";
import { cn } from "../lib/cn.ts";

export type SeparatorProps = {
  /** Defaults to a spaced middle dot (` · `), matching `common.separator`. */
  children?: string;
  className?: string;
};

/** Inline meta separator — decorative, hidden from accessibility trees. */
export function Separator({ children = " · ", className }: SeparatorProps) {
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("text-muted-dim", className)}
    >
      {children}
    </Text>
  );
}
