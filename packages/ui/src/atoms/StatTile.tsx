/// <reference types="nativewind/types" />
import { Text, View } from "react-native";
import { cn } from "../lib/cn.ts";

export type StatTileProps = {
  label: string;
  value: string;
  sub?: string;
  className?: string;
};

/** ui.md stats tile — label / display value / optional subline. */
export function StatTile({ label, value, sub, className }: StatTileProps) {
  return (
    <View
      className={cn(
        "flex-1 flex-col items-center gap-3 rounded-md border border-white/10 bg-white/5 p-6",
        className,
      )}
    >
      <Text className="text-center font-mono text-xs uppercase tracking-widest text-muted">
        {label}
      </Text>
      <Text className="text-center font-display text-4xl italic leading-none tracking-tight text-snow">
        {value}
      </Text>
      {sub ? <Text className="text-center font-mono text-[10px] text-muted-dim">{sub}</Text> : null}
    </View>
  );
}
