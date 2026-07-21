/// <reference types="nativewind/types" />
import { X } from "lucide-react-native";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { borders } from "../lib/borders.ts";
import { cn } from "../lib/cn.ts";
import { useOverlayLock } from "../lib/overlayLock.tsx";
import { colors } from "../tokens.ts";

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Bottom-sheet header title. */
  title?: string;
  titleAccessory?: ReactNode;
  /** Applied to the scroll body's content container (padding / gap). */
  className?: string;
  /** a11y label for the close control. */
  closeLabel?: string;
  /**
   * When false, children render without an inner ScrollView (caller owns scrolling).
   * Default true so tall sheets (episode details, series details) scroll on tablet.
   */
  scrollable?: boolean;
  /** Forwarded to the inner ScrollView; set false while a child owns a drag gesture. */
  scrollEnabled?: boolean;
};

const TITLE_BAR_H = 52;
const SHEET_MAX_RATIO = 0.9;
/** Match web `animate-backdrop` / `animate-backdrop-out`. */
const BACKDROP_MS = 200;
/** Match web `animate-sheet` / `animate-sheet-out`. */
const SHEET_MS = 280;
const SHEET_EASE_IN = Easing.bezier(0.16, 1, 0.3, 1);
const SHEET_EASE_OUT = Easing.bezier(0.7, 0, 0.84, 0);

/**
 * Mobile-first bottom sheet overlay.
 * Web desktop modal/popover/portal behavior stays in `apps/web` until RN Web.
 *
 * Backdrop fades; sheet slides — RN `animationType="slide"` would move both.
 */
export function Modal({
  isOpen,
  onClose,
  children,
  title,
  titleAccessory,
  className,
  closeLabel = "Close",
  scrollable = true,
  scrollEnabled = true,
}: ModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const sheetMax = Math.round(windowHeight * SHEET_MAX_RATIO);
  const bodyMax = Math.max(120, sheetMax - (title ? TITLE_BAR_H : 0));
  const { acquire, release } = useOverlayLock();

  const [visible, setVisible] = useState(isOpen);
  const shownRef = useRef(isOpen);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(windowHeight)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  // Lock underlying PullToRefresh / ScrollView while this sheet is open (or
  // still animating closed) so sheet scrolls don't drive pull-to-history.
  const overlayActive = isOpen || visible;
  useEffect(() => {
    if (!overlayActive) return;
    acquire();
    return release;
  }, [overlayActive, acquire, release]);

  useEffect(() => {
    animRef.current?.stop();

    if (isOpen) {
      shownRef.current = true;
      setVisible(true);
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(windowHeight);
      const open = Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: BACKDROP_MS,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: SHEET_MS,
          easing: SHEET_EASE_IN,
          useNativeDriver: true,
        }),
      ]);
      animRef.current = open;
      open.start();
      return () => {
        open.stop();
      };
    }

    if (!shownRef.current) return;

    const close = Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: BACKDROP_MS,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: windowHeight,
        duration: SHEET_MS,
        easing: SHEET_EASE_OUT,
        useNativeDriver: true,
      }),
    ]);
    animRef.current = close;
    close.start(({ finished }) => {
      if (finished) {
        shownRef.current = false;
        setVisible(false);
      }
    });
    return () => {
      close.stop();
    };
  }, [isOpen, windowHeight, backdropOpacity, sheetTranslateY]);

  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Animated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFillObject, { opacity: backdropOpacity }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            className="absolute inset-0 bg-black/60"
            onPress={onClose}
          />
        </Animated.View>
        <Animated.View
          className="overflow-hidden rounded-t-2xl bg-[#101010] shadow-2xl"
          style={[
            { maxHeight: sheetMax, transform: [{ translateY: sheetTranslateY }] },
            borders.subtle,
          ]}
        >
          {title ? (
            <View
              className="flex-row items-center gap-2 border-b border-white/5 px-4 py-3"
              style={{ minHeight: TITLE_BAR_H }}
            >
              <Text className="min-w-0 flex-1 font-display text-lg italic text-snow">{title}</Text>
              {titleAccessory}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                onPress={onClose}
                className="h-9 w-9 items-center justify-center rounded-full active:bg-white/5"
              >
                <X size={18} color={colors.muted} />
              </Pressable>
            </View>
          ) : null}

          {scrollable ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces
              scrollEnabled={scrollEnabled}
              style={{ maxHeight: bodyMax }}
              contentContainerClassName={cn(className)}
            >
              {children}
            </ScrollView>
          ) : (
            <View className={cn(className)} style={{ maxHeight: bodyMax }}>
              {children}
            </View>
          )}
        </Animated.View>
      </View>
    </RNModal>
  );
}
