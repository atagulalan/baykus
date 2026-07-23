/**
 * Injectable haptics for shared UI.
 *
 * `packages/ui` must not depend on `expo-haptics` (web / Storybook stay no-op).
 * Mobile installs a real driver once at boot via `installHaptics`.
 */

export type HapticKind =
  | "selection"
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

export type HapticsDriver = (kind: HapticKind) => void;

let driver: HapticsDriver | null = null;

/** Replace the no-op driver (call from mobile root layout). */
export function installHaptics(next: HapticsDriver | null): void {
  driver = next;
}

/** Fire a haptic if a driver is installed; safe to call on web. */
export function haptic(kind: HapticKind): void {
  driver?.(kind);
}
