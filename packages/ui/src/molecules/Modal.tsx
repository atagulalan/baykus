/// <reference types="nativewind/types" />
import { X } from "lucide-react-native";
import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { borders } from "../lib/borders.ts";
import { cn } from "../lib/cn.ts";
import { haptic } from "../lib/haptics.ts";
import { useOverlayLock } from "../lib/overlayLock.tsx";
import {
  type AnchorRect,
  computePopoverLayout,
  POPOVER_WIDTH,
  type PopoverAlign,
} from "../lib/popoverLayout.ts";
import { colors } from "../tokens.ts";

export type ModalPopoverAlign = PopoverAlign;

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Bottom-sheet header title. Popover uses this for a11y only. */
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
  /**
   * Centered panel width when `width >= 640` (`default` ≈ 24rem menus, `large` ≈ 32rem).
   * Phone presentation is always a bottom sheet. Ignored for `presentation="popover"`.
   */
  size?: "default" | "large";
  /**
   * Tablet (≥640) presentation. Phone is always a bottom sheet.
   * - `modal` (default): centered card
   * - `popover`: compact panel anchored near `anchorRef` (web `desktop="popover"`)
   */
  presentation?: "modal" | "popover";
  /** Trigger view for popover placement (`measureInWindow`). */
  anchorRef?: RefObject<View | null>;
  /** Popover placement relative to the anchor (web Modal parity). */
  popoverAlign?: ModalPopoverAlign;
  /**
   * Fired after the close animation finishes and the native RN Modal unmounts
   * (`visible=false`). Use this to open a follow-up Modal — iOS cannot present
   * a second Modal while another is still dismissing.
   */
  onExitComplete?: () => void;
};

const TITLE_BAR_H = 52;
const HANDLE_H = 28;
const SHEET_MAX_RATIO = 0.9;
/** Match web `sm` handoff — centered panel instead of full-bleed sheet. */
const TABLET_MIN_WIDTH = 640;
/** Tailwind `max-w-sm` / `max-w-lg` in px (16px rem). */
const PANEL_MAX_DEFAULT = 384;
const PANEL_MAX_LARGE = 512;
/** First-pass height before `onLayout` (≈4–5 action rows). */
const POPOVER_HEIGHT_ESTIMATE = 220;
const SHEET_DISMISS_PX = 80;
const SHEET_FLING_VELOCITY = 0.45;
/** Match web `animate-backdrop` / `animate-backdrop-out`. */
const BACKDROP_MS = 200;
/** Sheet open uses spring; close timing stays snappy. */
const SHEET_CLOSE_MS = 240;
const SHEET_EASE_OUT = Easing.bezier(0.7, 0, 0.84, 0);
const SHEET_SPRING = { damping: 28, stiffness: 280, mass: 0.9 } as const;

function SheetDragHandle() {
  return (
    <View
      className="items-center px-4 pb-2 pt-3"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View className="h-1 w-10 rounded-full bg-white/25" />
    </View>
  );
}

function measureAnchor(anchorRef: RefObject<View | null>): Promise<AnchorRect | null> {
  return new Promise((resolve) => {
    const node = anchorRef.current;
    if (!node) {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      if (width <= 0 && height <= 0) {
        resolve(null);
        return;
      }
      resolve({ x, y, width, height });
    });
  });
}

/**
 * Mobile-first bottom sheet overlay.
 * Web desktop modal/popover/portal behavior stays in `apps/web` until RN Web.
 *
 * Backdrop fades; sheet slides — RN `animationType="slide"` would move both.
 * At ≥640px width: centered panel (`presentation="modal"`) or anchored popover.
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
  size = "default",
  presentation = "modal",
  anchorRef,
  popoverAlign = "end",
  onExitComplete,
}: ModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = windowWidth >= TABLET_MIN_WIDTH;
  const isPopover = isTablet && presentation === "popover";
  const panelMaxWidth = size === "large" ? PANEL_MAX_LARGE : PANEL_MAX_DEFAULT;
  const sheetMax = Math.round(windowHeight * (isTablet ? 0.85 : SHEET_MAX_RATIO));
  const chromeH = isPopover ? 0 : (isTablet ? 0 : HANDLE_H) + (title ? TITLE_BAR_H : 0);
  /** Phone bottom sheets only — web parity `1rem + env(safe-area-inset-bottom)`. */
  const sheetBottomInset = isTablet ? 0 : Math.round(insets.bottom) + 16;
  const bodyMax = Math.max(
    120,
    (isPopover ? Math.round(windowHeight * 0.7) : sheetMax) - chromeH - sheetBottomInset,
  );
  const { acquire, release } = useOverlayLock();

  const [visible, setVisible] = useState(isOpen);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const [popoverHeight, setPopoverHeight] = useState(POPOVER_HEIGHT_ESTIMATE);
  const shownRef = useRef(isOpen);
  /** One light tick per open session (incl. ConfirmDialog mount-open). */
  const openHapticRef = useRef(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(windowHeight)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onExitCompleteRef = useRef(onExitComplete);
  onExitCompleteRef.current = onExitComplete;
  const lastDragY = useRef(0);
  const lastDragT = useRef(0);
  const velocityY = useRef(0);
  /** While true, open/close animations must not reset translate (swipe owns it). */
  const swipeDismissingRef = useRef(false);
  const finishExitRef = useRef(() => {});
  finishExitRef.current = () => {
    shownRef.current = false;
    openHapticRef.current = false;
    swipeDismissingRef.current = false;
    // Park translate off-screen before zeroing drag. dragY→0 with
    // sheetTranslateY still at 0 would flash the sheet for a frame
    // before RNModal's visible=false commits.
    dragY.stopAnimation();
    sheetTranslateY.setValue(windowHeight);
    dragY.setValue(0);
    setVisible(false);
    setAnchorRect(null);
    setPopoverHeight(POPOVER_HEIGHT_ESTIMATE);
    onExitCompleteRef.current?.();
  };

  // Lock underlying PullToRefresh / ScrollView while this sheet is open (or
  // still animating closed) so sheet scrolls don't drive pull-to-history.
  // Popovers keep the page scrollable (web parity) — skip lock.
  const overlayActive = isOpen || visible;
  useEffect(() => {
    if (!overlayActive || isPopover) return;
    acquire();
    return release;
  }, [overlayActive, isPopover, acquire, release]);

  useEffect(() => {
    animRef.current?.stop();
    let cancelled = false;

    if (isOpen) {
      if (!openHapticRef.current) {
        openHapticRef.current = true;
        haptic("light");
      }
      shownRef.current = true;
      swipeDismissingRef.current = false;
      setVisible(true);
      backdropOpacity.setValue(0);
      dragY.setValue(0);

      const runOpen = (rect: AnchorRect | null) => {
        if (cancelled) return;
        setAnchorRect(rect);
        setPopoverHeight(POPOVER_HEIGHT_ESTIMATE);
        if (isPopover) {
          sheetTranslateY.setValue(0);
          panelOpacity.setValue(0);
          const open = Animated.parallel([
            Animated.timing(backdropOpacity, {
              toValue: 1,
              duration: BACKDROP_MS,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(panelOpacity, {
              toValue: 1,
              duration: BACKDROP_MS,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]);
          animRef.current = open;
          open.start();
          return;
        }

        sheetTranslateY.setValue(windowHeight);
        panelOpacity.setValue(1);
        const open = Animated.parallel([
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: BACKDROP_MS,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            ...SHEET_SPRING,
          }),
        ]);
        animRef.current = open;
        open.start();
      };

      if (isPopover && anchorRef) {
        void measureAnchor(anchorRef).then(runOpen);
      } else {
        runOpen(null);
      }

      return () => {
        cancelled = true;
        animRef.current?.stop();
      };
    }

    if (!shownRef.current) return;

    if (swipeDismissingRef.current) {
      // Swipe already drives the sheet via dragY — only fade the backdrop.
      // Hold teardown until the sheet slide would finish so we don't clear
      // dragY while the panel is still mid-flight (1–2 frame flash at rest).
      const close = Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: Math.max(BACKDROP_MS, SHEET_CLOSE_MS),
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      });
      animRef.current = close;
      close.start(({ finished }) => {
        if (finished) finishExitRef.current();
      });
      return () => {
        close.stop();
      };
    }

    const closeAnims = [
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: BACKDROP_MS,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ];
    if (isPopover) {
      closeAnims.push(
        Animated.timing(panelOpacity, {
          toValue: 0,
          duration: BACKDROP_MS,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      );
    } else {
      closeAnims.push(
        Animated.timing(sheetTranslateY, {
          toValue: windowHeight,
          duration: SHEET_CLOSE_MS,
          easing: SHEET_EASE_OUT,
          useNativeDriver: true,
        }),
      );
    }
    const close = Animated.parallel(closeAnims);
    animRef.current = close;
    close.start(({ finished }) => {
      if (finished) finishExitRef.current();
    });
    return () => {
      close.stop();
    };
  }, [
    isOpen,
    isPopover,
    anchorRef,
    windowHeight,
    backdropOpacity,
    sheetTranslateY,
    panelOpacity,
    dragY,
  ]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isTablet,
        onMoveShouldSetPanResponder: (_, g) =>
          !isTablet && g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => {
          lastDragY.current = 0;
          lastDragT.current = Date.now();
          velocityY.current = 0;
          dragY.stopAnimation();
        },
        onPanResponderMove: (_, g) => {
          const dy = Math.max(0, g.dy);
          dragY.setValue(dy);
          const now = Date.now();
          const dt = Math.max(1, now - lastDragT.current);
          velocityY.current = (dy - lastDragY.current) / dt;
          lastDragY.current = dy;
          lastDragT.current = now;
        },
        onPanResponderRelease: (_, g) => {
          const dy = Math.max(0, g.dy);
          const fling = velocityY.current >= SHEET_FLING_VELOCITY;
          if (dy >= SHEET_DISMISS_PX || fling) {
            swipeDismissingRef.current = true;
            Animated.timing(dragY, {
              toValue: windowHeight,
              duration: SHEET_CLOSE_MS,
              easing: SHEET_EASE_OUT,
              useNativeDriver: true,
            }).start();
            onCloseRef.current();
            return;
          }
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            ...SHEET_SPRING,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            ...SHEET_SPRING,
          }).start();
        },
      }),
    [dragY, isTablet, windowHeight],
  );

  const sheetTranslate = Animated.add(sheetTranslateY, dragY);
  const popoverPos =
    isPopover && anchorRect
      ? computePopoverLayout(
          anchorRect,
          popoverAlign,
          windowWidth,
          windowHeight,
          Math.min(popoverHeight, bodyMax + chromeH),
        )
      : null;
  // Popover without a measurable anchor falls back to a compact centered card.
  const popoverFallbackCenter = isPopover && !popoverPos;

  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View
        className={cn(
          "flex-1",
          isPopover
            ? "justify-start"
            : isTablet
              ? "items-center justify-center p-4"
              : "justify-end",
        )}
        // Popovers need a full-screen hit target for outside dismiss; sheets
        // keep box-none so the dimmed backdrop Pressable owns empty space.
        pointerEvents={isPopover ? "auto" : "box-none"}
      >
        <Animated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFillObject, { opacity: backdropOpacity }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={onClose}
            // Near-transparent fill so native hit-testing never skips a fully
            // clear backdrop (popover) or misses the dimmed sheet scrim.
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: isPopover ? "rgba(0,0,0,0.01)" : "rgba(0,0,0,0.6)" },
            ]}
          />
        </Animated.View>
        <Animated.View
          accessibilityLabel={title}
          onLayout={
            isPopover
              ? (e) => {
                  const h = Math.round(e.nativeEvent.layout.height);
                  if (h > 0) setPopoverHeight((prev) => (prev === h ? prev : h));
                }
              : undefined
          }
          className={cn(
            "overflow-hidden bg-[#101010] shadow-2xl",
            isPopover || popoverFallbackCenter
              ? "rounded-xl"
              : isTablet
                ? "w-full rounded-2xl"
                : "w-full rounded-t-2xl",
          )}
          style={[
            {
              maxHeight: isPopover ? bodyMax + chromeH : sheetMax,
              opacity: isPopover ? panelOpacity : 1,
              // Phone sheets clear the home indicator; tablet popover/modal stay flush.
              ...(sheetBottomInset > 0 ? { paddingBottom: sheetBottomInset } : null),
              // Omit the key when unused — `transform: undefined` can become
              // `null` after style flatten and RN `processTransform(null)` does
              // `null.forEach` ("Cannot read properties of null (reading 'forEach')").
              ...(isPopover ? {} : { transform: [{ translateY: sheetTranslate }] }),
              ...(popoverPos
                ? {
                    position: "absolute" as const,
                    top: popoverPos.top,
                    left: popoverPos.left,
                    width: popoverPos.width,
                  }
                : isPopover || popoverFallbackCenter
                  ? {
                      alignSelf: "center" as const,
                      maxWidth: POPOVER_WIDTH,
                      width: POPOVER_WIDTH,
                      ...(popoverFallbackCenter
                        ? { marginTop: Math.round(windowHeight * 0.25) }
                        : null),
                    }
                  : isTablet
                    ? { maxWidth: panelMaxWidth, width: "100%" as const }
                    : null),
            },
            borders.subtle,
          ]}
        >
          {!isTablet && !isPopover ? (
            <View {...panResponder.panHandlers}>
              <SheetDragHandle />
              {title ? (
                <View
                  className="flex-row items-center gap-2 border-b border-white/5 px-4 py-3"
                  style={{ minHeight: TITLE_BAR_H }}
                >
                  <Text
                    numberOfLines={1}
                    className="min-w-0 flex-1 font-display text-lg italic text-snow"
                  >
                    {title}
                  </Text>
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
            </View>
          ) : !isPopover && title ? (
            <View
              className="flex-row items-center gap-2 border-b border-white/5 px-4 py-3"
              style={{ minHeight: TITLE_BAR_H }}
            >
              <Text
                numberOfLines={1}
                className="min-w-0 flex-1 font-display text-lg italic text-snow"
              >
                {title}
              </Text>
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
              bounces={false}
              overScrollMode="never"
              scrollEnabled={scrollEnabled}
              style={{ maxHeight: bodyMax }}
              contentContainerClassName={cn(className)}
              {...(Platform.OS === "ios" ? { alwaysBounceVertical: false } : null)}
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
