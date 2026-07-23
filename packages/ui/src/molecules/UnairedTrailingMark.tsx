/// <reference types="nativewind/types" />
import { Text, View } from "react-native";
import type { UnairedTrailingState } from "../lib/airDateLabel.ts";

export type UnairedTrailingMarkLabels = {
  day: (count: number) => string;
  hour: (count: number) => string;
  minute: string;
  second: string;
  tbd: string;
};

export type UnairedTrailingMarkProps = {
  state: UnairedTrailingState;
  labels: UnairedTrailingMarkLabels;
};

/**
 * Day / hour / minute / second / TBD trailing affordance for unaired episodes
 * (011 E151). Callers supply resolved i18n unit strings.
 */
export function UnairedTrailingMark({ state, labels }: UnairedTrailingMarkProps) {
  if (state.kind === "none") return null;

  if (state.kind === "tbd") {
    return (
      <Text className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted">
        {labels.tbd}
      </Text>
    );
  }

  const value =
    state.kind === "countdown"
      ? state.days
      : state.kind === "countdownClock"
        ? state.hours
        : state.kind === "countdownMinutes"
          ? state.minutes
          : state.seconds;

  const unit =
    state.kind === "countdown"
      ? labels.day(state.days)
      : state.kind === "countdownClock"
        ? labels.hour(state.hours)
        : state.kind === "countdownMinutes"
          ? labels.minute
          : labels.second;

  return (
    <View className="min-w-5 shrink-0 flex-col items-center justify-center">
      <Text className="font-mono text-base tabular-nums text-snow/80">{value}</Text>
      <Text className="mt-0.5 font-mono text-[9px] text-muted">{unit}</Text>
    </View>
  );
}
