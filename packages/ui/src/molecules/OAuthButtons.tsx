/// <reference types="nativewind/types" />
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";

export type OAuthProviderId = "google" | "apple";

export type OAuthButtonsProps = {
  providers: Array<{ id: OAuthProviderId; label: string; available: boolean }>;
  onPress: (provider: OAuthProviderId) => void | Promise<void>;
  busyProvider?: OAuthProviderId | null;
  footer?: ReactNode;
};

/**
 * OAuth button shell — native SDKs / token acquisition live in the app shell.
 */
export function OAuthButtons({
  providers,
  onPress,
  busyProvider = null,
  footer,
}: OAuthButtonsProps) {
  return (
    <View className="w-full gap-2">
      {providers.map((p) => {
        const busy = busyProvider === p.id;
        return (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            disabled={!p.available || busy || busyProvider !== null}
            onPress={() => {
              void onPress(p.id);
            }}
            className={cn(
              "h-11 flex-row items-center justify-center rounded-full px-4",
              !p.available || busyProvider !== null ? "opacity-40" : "active:bg-white/5",
            )}
            style={{
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.15)",
              borderStyle: "solid",
            }}
          >
            {busy ? (
              <ActivityIndicator color={colors.snow} />
            ) : (
              <Text className="font-sans text-xs font-semibold uppercase tracking-widest text-snow">
                {p.label}
              </Text>
            )}
          </Pressable>
        );
      })}
      {footer}
    </View>
  );
}
