/// <reference types="nativewind/types" />
import { Text, View } from "react-native";
import { formatAirStampLocal, formatAirStampOrigin } from "../lib/airing.ts";

export type ReleaseTimeProps = {
  airStamp: string;
  /** i18n label for the row (e.g. t("episode.airTime")). */
  label: string;
  locale: string;
};

/** Meta-row text for episode details — local time + origin network time. */
export function ReleaseTime({ airStamp, label, locale }: ReleaseTimeProps) {
  const localTime = formatAirStampLocal(airStamp, locale);
  const originTime = formatAirStampOrigin(airStamp);

  return (
    <View className="flex-row items-baseline justify-between gap-4 py-1.5">
      <Text className="shrink-0 text-muted">{label}</Text>
      <Text className="min-w-0 text-right tabular-nums text-snow/80">
        {localTime}
        <Text className="text-muted"> ({originTime})</Text>
      </Text>
    </View>
  );
}
