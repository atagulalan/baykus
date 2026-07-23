/// <reference types="nativewind/types" />
import { Text } from "react-native";
import { formatAirDateLabel } from "../lib/airDateLabel.ts";
import { cn } from "../lib/cn.ts";

export type AirDateLabelProps = {
  /** ISO calendar date `YYYY-MM-DD`. */
  airDate: string;
  locale: string;
  /** Force long absolute date (skip near relative labels). */
  absolute?: boolean;
  /** Override "today" for relative math (tests). */
  today?: string;
  className?: string;
};

/**
 * Near dates as relative labels (Today / Yesterday / …); otherwise a long
 * absolute date. Mirrors web `formatAirDateLabel`.
 */
export function AirDateLabel({
  airDate,
  locale,
  absolute = false,
  today,
  className,
}: AirDateLabelProps) {
  const label = formatAirDateLabel(airDate, locale, {
    isAbsoluteDate: absolute,
    ...(today !== undefined ? { today } : {}),
  });

  return (
    <Text className={cn("font-mono text-xs tabular-nums text-snow/80", className)}>{label}</Text>
  );
}
