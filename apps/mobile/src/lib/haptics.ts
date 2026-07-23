import { type HapticKind, installHaptics } from "@baykus/ui";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Map shared haptic kinds → expo-haptics. No-op on Expo web (no vibration
 * surface we care about) and swallow native failures (simulator / disabled).
 */
function fire(kind: HapticKind): void {
  if (Platform.OS === "web") return;
  const run = (): Promise<void> => {
    switch (kind) {
      case "selection":
        return Haptics.selectionAsync();
      case "light":
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case "medium":
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case "heavy":
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      case "success":
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case "warning":
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      case "error":
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  void run().catch(() => {
    /* ignore — unsupported / muted devices */
  });
}

/** Wire expo-haptics into `@baykus/ui` shared controls. Idempotent. */
export function bootstrapHaptics(): void {
  installHaptics(fire);
}
