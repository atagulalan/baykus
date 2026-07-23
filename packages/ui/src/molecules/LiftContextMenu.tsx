/// <reference types="nativewind/types" />
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  Modal as RNModal,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { borders } from "../lib/borders.ts";
import { cn } from "../lib/cn.ts";
import { haptic } from "../lib/haptics.ts";
import { useOverlayLock } from "../lib/overlayLock.tsx";
import { colors } from "../tokens.ts";
import type { ActionSheetItem } from "./ActionSheet.tsx";

export type LiftSourceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LiftContextMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  sourceRect: LiftSourceRect | null;
  preview: ReactNode;
  items: ActionSheetItem[];
  busy?: boolean;
  /** a11y label for the menu region. */
  title: string;
  closeLabel?: string;
  /**
   * Safe-area insets (notch / Dynamic Island / home indicator).
   * Vertical lift target is centered inside the inset band.
   */
  insetTop?: number;
  insetBottom?: number;
  /** After close animation — safe point to open a follow-up Modal (iOS). */
  onExitComplete?: () => void;
};

const LIFT_SCALE = 1.06;
const MENU_GAP = 10;
const EDGE = 16;
const OPEN_MS = 220;
const CLOSE_MS = 180;
const OPEN_EASING = Easing.out(Easing.cubic);
const CLOSE_EASING = Easing.in(Easing.cubic);

type TargetLayout = {
  previewX: number;
  previewY: number;
  menuX: number;
  menuY: number;
  menuWidth: number;
};

function computeTarget(
  rect: LiftSourceRect,
  windowW: number,
  windowH: number,
  itemCount: number,
  insetTop: number,
  insetBottom: number,
): TargetLayout {
  const previewW = rect.width;
  const previewH = rect.height;
  const menuWidth = Math.min(windowW - EDGE * 2, Math.max(previewW * LIFT_SCALE, 240));
  const menuEstimateH = Math.min(itemCount * 52 + 8, windowH * 0.42);
  const blockH = previewH * LIFT_SCALE + MENU_GAP + menuEstimateH;
  const previewX = (windowW - previewW) / 2;
  // Keep the lifted card + menu inside the safe area (iOS notch / home bar).
  const usableTop = insetTop + EDGE;
  const usableBottom = windowH - insetBottom - EDGE;
  const usableH = Math.max(blockH, usableBottom - usableTop);
  let previewY = usableTop + (usableH - blockH) / 2 - 12;
  previewY = Math.max(usableTop, Math.min(previewY, usableBottom - blockH));
  const menuX = (windowW - menuWidth) / 2;
  // Layout box + scale-around-center → visual bottom of preview.
  const menuY = previewY + (previewH * (1 + LIFT_SCALE)) / 2 + MENU_GAP;
  return { previewX, previewY, menuX, menuY, menuWidth };
}

/**
 * Cross-platform iOS-style context menu: dim backdrop, lift preview from
 * `sourceRect`, branded action list under the preview (not a bottom sheet).
 */
export function LiftContextMenu({
  isOpen,
  onClose,
  sourceRect,
  preview,
  items,
  busy = false,
  title,
  closeLabel = "Close",
  insetTop = 0,
  insetBottom = 0,
  onExitComplete,
}: LiftContextMenuProps) {
  const { width: windowW, height: windowH } = useWindowDimensions();
  const { acquire, release } = useOverlayLock();
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useSharedValue(0);
  const onExitCompleteRef = useRef(onExitComplete);
  onExitCompleteRef.current = onExitComplete;
  const notifyExitComplete = useCallback(() => {
    onExitCompleteRef.current?.();
  }, []);

  const target = useMemo(() => {
    if (!sourceRect) return null;
    return computeTarget(
      sourceRect,
      windowW,
      windowH,
      Math.max(items.length, 1),
      insetTop,
      insetBottom,
    );
  }, [sourceRect, windowW, windowH, items.length, insetTop, insetBottom]);

  const overlayActive = isOpen || visible;

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (!cancelled) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!overlayActive) return;
    acquire();
    return release;
  }, [overlayActive, acquire, release]);

  useEffect(() => {
    if (isOpen && sourceRect && target) {
      const opening = !visible;
      setVisible(true);
      if (opening) haptic("medium");
      const duration = reduceMotion ? 0 : OPEN_MS;
      progress.value = withTiming(1, { duration, easing: OPEN_EASING });
      return;
    }
    if (!isOpen && visible) {
      const duration = reduceMotion ? 0 : CLOSE_MS;
      progress.value = withTiming(0, { duration, easing: CLOSE_EASING }, (finished) => {
        if (finished) {
          runOnJS(setVisible)(false);
          runOnJS(notifyExitComplete)();
        }
      });
    }
  }, [isOpen, sourceRect, target, progress, reduceMotion, visible, notifyExitComplete]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.72,
  }));

  const previewStyle = useAnimatedStyle(() => {
    if (!sourceRect || !target) return { opacity: 0 };
    const t = progress.value;
    return {
      position: "absolute" as const,
      left: sourceRect.x + (target.previewX - sourceRect.x) * t,
      top: sourceRect.y + (target.previewY - sourceRect.y) * t,
      width: sourceRect.width,
      height: sourceRect.height,
      transform: [{ scale: 1 + (LIFT_SCALE - 1) * t }],
      opacity: 1,
      zIndex: 2,
    };
  }, [sourceRect, target]);

  const menuStyle = useAnimatedStyle(() => {
    if (!target) return { opacity: 0 };
    const t = progress.value;
    return {
      position: "absolute" as const,
      left: target.menuX,
      top: target.menuY,
      width: target.menuWidth,
      opacity: Math.max(0, (t - 0.35) / 0.65),
      transform: [{ translateY: (1 - t) * 10 }],
      zIndex: 3,
    };
  }, [target]);

  if (!visible || !sourceRect || !target) return null;

  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1" accessibilityViewIsModal>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.void }, backdropStyle]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            previewStyle,
            {
              elevation: 12,
              shadowColor: "#000",
              shadowOpacity: 0.45,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
            },
          ]}
        >
          {preview}
        </Animated.View>
        <Animated.View
          accessibilityRole="menu"
          accessibilityLabel={title}
          style={[menuStyle, borders.subtle]}
          className="overflow-hidden rounded-xl bg-void"
        >
          {busy ? (
            <View className="items-center py-8">
              <ActivityIndicator color={colors.yellow} />
            </View>
          ) : (
            <View>
              {items.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="menuitem"
                  disabled={item.disabled}
                  onPress={() => {
                    if (item.disabled) return;
                    haptic(item.danger ? "warning" : "light");
                    item.onPress();
                    onClose();
                  }}
                  className="flex-row items-center gap-2 border-b border-white/5 px-4 py-3.5 active:bg-white/5 disabled:opacity-40"
                >
                  {item.icon}
                  <Text
                    className={cn("font-sans text-sm", item.danger ? "text-red-400" : "text-muted")}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </Animated.View>
      </View>
    </RNModal>
  );
}
