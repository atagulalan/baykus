/// <reference types="nativewind/types" />
import { History } from "lucide-react-native";
import {
  createContext,
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  type FlatListProps,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  PanResponder,
  type PanResponderGestureState,
  RefreshControl,
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { haptic } from "../lib/haptics.ts";
import { OverlayLockProvider, useOverlayLock } from "../lib/overlayLock.tsx";
import { colors } from "../tokens.ts";

/** E132 / E160 gesture tuning — match web PullToRefresh. */
const PULL_RESISTANCE = 2.5;
const PULL_THRESHOLD_PX = 60;
const PULL_MAX_PX = 96;
const LOCK_SLOP_PX = 10;
/** History label row — slides in from above the screen as an overlay. */
const HISTORY_CHROME_H = 28;
/** Resting gap below `indicatorInsetTop` (wordmark / safe-area pin line). */
const HISTORY_CHROME_GAP = 10;

type BaseProps = {
  children: ReactNode;
} & ScrollViewProps;

type RefreshVariantProps = BaseProps & {
  variant?: "refresh";
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
};

type HistoryVariantProps = BaseProps & {
  /** E160: Watch / Library open history instead of refreshing. */
  variant: "history";
  onOpen: () => void;
  /** i18n `watch.showHistory` — label beside the History icon while pulling. */
  historyLabel: string;
  /**
   * Pin the pull chrome below fixed app chrome (wordmark + safe area).
   * Full-bleed lists pad content under that chrome; without this the label
   * draws at y=0 and stays hidden behind the header.
   */
  indicatorInsetTop?: number;
};

export type PullToRefreshProps = RefreshVariantProps | HistoryVariantProps;

type ListNativeWind = {
  className?: string;
  contentContainerClassName?: string;
};

type ListRefreshProps<T> = Omit<FlatListProps<T>, "refreshControl" | "ref"> &
  ListNativeWind & {
    variant?: "refresh";
    refreshing?: boolean;
    onRefresh?: () => void | Promise<void>;
    /** Imperative FlatList handle (scrollToOffset, etc.). */
    listRef?: Ref<FlatList<T>>;
  };

type ListHistoryProps<T> = Omit<FlatListProps<T>, "refreshControl" | "ref"> &
  ListNativeWind & {
    variant: "history";
    onOpen: () => void;
    historyLabel: string;
    /** See `PullToRefreshProps` history variant. */
    indicatorInsetTop?: number;
    listRef?: Ref<FlatList<T>>;
  };

export type PullToRefreshListProps<T> = ListRefreshProps<T> | ListHistoryProps<T>;

function contentStyle(
  contentContainerStyle: StyleProp<ViewStyle> | undefined,
  sticky: boolean,
): StyleProp<ViewStyle> {
  // `flexGrow: 1` breaks ScrollView `stickyHeaderIndices` on RN — only use it
  // when the list is not sticky-header driven.
  if (sticky) return contentContainerStyle;
  return [{ flexGrow: 1 }, contentContainerStyle];
}

function clampPullPx(dy: number): number {
  return Math.max(0, Math.min(dy / PULL_RESISTANCE, PULL_MAX_PX));
}

type HistoryChromeRegistration = {
  pullPx: SharedValue<number>;
  historyLabel: string;
  pastThreshold: boolean;
  insetTop: number;
};

type HistoryChromeHostApi = {
  register: (next: HistoryChromeRegistration | null) => void;
};

/**
 * Renders the history pull label *after* list + sticky SectionPill overlays so
 * it always wins stacking (StickySectionScroll pin is z-30). Without a host,
 * HistoryPull* paint the chrome locally.
 */
const HistoryChromeHostContext = createContext<HistoryChromeHostApi | null>(null);

/** Active history-pull distance — sticky pin clones ride this with the list. */
const HistoryPullShiftContext = createContext<SharedValue<number> | null>(null);

export function HistoryPullChromeHost({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HistoryChromeRegistration | null>(null);
  const register = useCallback((next: HistoryChromeRegistration | null) => {
    setSlot((prev) => {
      if (prev === next) return prev;
      if (
        prev &&
        next &&
        prev.pullPx === next.pullPx &&
        prev.historyLabel === next.historyLabel &&
        prev.pastThreshold === next.pastThreshold &&
        prev.insetTop === next.insetTop
      ) {
        return prev;
      }
      return next;
    });
  }, []);
  const api = useMemo(() => ({ register }), [register]);
  return (
    <HistoryChromeHostContext.Provider value={api}>
      <HistoryPullShiftContext.Provider value={slot?.pullPx ?? null}>
        {children}
      </HistoryPullShiftContext.Provider>
      {slot ? (
        <HistoryPullChrome
          pullPx={slot.pullPx}
          historyLabel={slot.historyLabel}
          pastThreshold={slot.pastThreshold}
          insetTop={slot.insetTop}
        />
      ) : null}
    </HistoryChromeHostContext.Provider>
  );
}

/**
 * Wraps the floating sticky SectionPill so it rubber-bands with the list on
 * history pull. Without this, a stuck pin stays glued under the header while
 * the FlatList translates — looks broken when İzleniyor (etc.) is pinned.
 */
export function HistoryPullShift({
  children,
  style,
  className,
  pointerEvents,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  pointerEvents?: "auto" | "none" | "box-none" | "box-only";
}) {
  const pullPx = useContext(HistoryPullShiftContext);
  const idle = useSharedValue(0);
  const source = pullPx ?? idle;
  const shiftStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: source.value }],
    }),
    [source],
  );
  return (
    <Animated.View
      {...(pointerEvents !== undefined ? { pointerEvents } : {})}
      {...(className !== undefined ? { className } : {})}
      style={[style, shiftStyle]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * History pull gesture.
 *
 * Drive the rubber-band with a Reanimated shared value + `translateY` (not
 * `paddingTop` / React state every frame). Padding forced a full FlatList
 * reflow of every sticky section / accordion cell on each move — that was the
 * Library/Watch jank. Transform is compositor-only; sticky chrome stays a
 * sibling overlay in StickySectionScroll, so the web "transform breaks sticky"
 * constraint does not apply here.
 */
function useHistoryPull(onOpen: () => void) {
  const { locked: overlayLocked } = useOverlayLock();
  const pullPx = useSharedValue(0);
  const [tracking, setTracking] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [pastThreshold, setPastThreshold] = useState(false);
  const pullPxRef = useRef(0);
  const pastThresholdRef = useRef(false);
  const scrollYRef = useRef(0);
  const gestureLockedRef = useRef(false);
  const overlayLockedRef = useRef(overlayLocked);
  overlayLockedRef.current = overlayLocked;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  const applyPull = useCallback(
    (px: number) => {
      pullPxRef.current = px;
      pullPx.value = px;
      const past = px >= PULL_THRESHOLD_PX;
      if (past !== pastThresholdRef.current) {
        pastThresholdRef.current = past;
        setPastThreshold(past);
        if (past) haptic("selection");
      }
    },
    [pullPx],
  );

  const collapse = useCallback(() => {
    applyPull(0);
    setTracking(false);
    gestureLockedRef.current = false;
    setScrollEnabled(true);
  }, [applyPull]);

  const release = useCallback(() => {
    const shouldOpen = gestureLockedRef.current && pullPxRef.current >= PULL_THRESHOLD_PX;
    collapse();
    if (shouldOpen) {
      haptic("medium");
      onOpenRef.current();
    }
  }, [collapse]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_evt, gesture: PanResponderGestureState) => {
          if (overlayLockedRef.current) return false;
          if (scrollYRef.current > 0) return false;
          if (gesture.dy < LOCK_SLOP_PX) return false;
          if (Math.abs(gesture.dx) > Math.abs(gesture.dy)) return false;
          return true;
        },
        onPanResponderGrant: () => {
          gestureLockedRef.current = true;
          setTracking(true);
          setScrollEnabled(false);
        },
        onPanResponderMove: (_evt, gesture: PanResponderGestureState) => {
          if (!gestureLockedRef.current) return;
          applyPull(clampPullPx(gesture.dy));
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: release,
        onPanResponderTerminate: collapse,
      }),
    [applyPull, collapse, release],
  );

  useEffect(() => () => collapse(), [collapse]);

  useEffect(() => {
    if (overlayLocked) collapse();
  }, [overlayLocked, collapse]);

  const noteScrollY = useCallback((y: number) => {
    scrollYRef.current = y;
  }, []);

  const shiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pullPx.value }],
  }));

  return {
    overlayLocked,
    tracking,
    scrollEnabled,
    pastThreshold,
    pullPx,
    pullArmed: !overlayLocked,
    panHandlers: panResponder.panHandlers,
    noteScrollY,
    shiftStyle,
  } as const;
}

/** Publish chrome into `HistoryPullChromeHost` when present; else render in-place. */
function useHistoryChromeSlot(
  pullPx: SharedValue<number>,
  historyLabel: string,
  pastThreshold: boolean,
  insetTop: number,
): boolean {
  const host = useContext(HistoryChromeHostContext);
  useLayoutEffect(() => {
    if (!host) return;
    host.register({ pullPx, historyLabel, pastThreshold, insetTop });
    return () => host.register(null);
  }, [host, pullPx, historyLabel, pastThreshold, insetTop]);
  return host != null;
}

/**
 * Absolute overlay: label rides in from above the screen (not a growing gap
 * that races sticky SectionPills). Hosted above the pin layer when possible.
 */
function HistoryPullChrome({
  pullPx,
  historyLabel,
  pastThreshold,
  insetTop = 0,
}: {
  pullPx: SharedValue<number>;
  historyLabel: string;
  pastThreshold: boolean;
  insetTop?: number;
}) {
  const restY = insetTop + HISTORY_CHROME_GAP;
  const style = useAnimatedStyle(() => {
    const t = Math.min(pullPx.value / PULL_THRESHOLD_PX, 1);
    // t=0 → fully above the screen; t=1 → parked under the header chrome.
    const y = -HISTORY_CHROME_H + t * (restY + HISTORY_CHROME_H);
    return {
      opacity: Math.min(pullPx.value / (PULL_THRESHOLD_PX * 0.35), 1),
      transform: [{ translateY: y }],
    };
  }, [restY]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="absolute inset-x-0 items-center justify-center"
      style={[
        {
          top: 0,
          height: HISTORY_CHROME_H,
          zIndex: 50,
          elevation: 50,
        },
        style,
      ]}
    >
      <View className="flex-row items-center justify-center gap-2">
        <History
          size={18}
          color={pastThreshold ? colors.yellow : colors.muted}
          strokeWidth={1.75}
        />
        <Text className={`text-xs ${pastThreshold ? "text-yellow" : "text-muted"}`}>
          {historyLabel}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * Native pull wrapper.
 * - `refresh` (default): system RefreshControl → `onRefresh`.
 * - `history`: E160 pull-to-open watch history — web-parity History icon + label
 *   that grows with the pull; navigates on release past threshold.
 */
export function PullToRefresh(props: PullToRefreshProps) {
  return (
    <OverlayLockProvider>
      {props.variant === "history" ? (
        <HistoryPullScroll {...props} />
      ) : (
        <RefreshPullScroll {...props} />
      )}
    </OverlayLockProvider>
  );
}

/** FlatList twin of `PullToRefresh` — use for virtualized sticky section lists. */
export function PullToRefreshList<T>(props: PullToRefreshListProps<T>) {
  return (
    <OverlayLockProvider>
      {props.variant === "history" ? (
        <HistoryPullList {...props} />
      ) : (
        <RefreshPullList {...props} />
      )}
    </OverlayLockProvider>
  );
}

function RefreshPullScroll({
  refreshing,
  onRefresh,
  children,
  style,
  contentContainerStyle,
  stickyHeaderIndices,
  removeClippedSubviews,
  scrollEnabled: scrollEnabledProp = true,
  variant: _,
  ...scrollProps
}: RefreshVariantProps) {
  const { locked } = useOverlayLock();
  const sticky = Boolean(stickyHeaderIndices && stickyHeaderIndices.length > 0);
  return (
    <ScrollView
      {...scrollProps}
      stickyHeaderIndices={stickyHeaderIndices}
      removeClippedSubviews={removeClippedSubviews ?? (sticky ? false : undefined)}
      style={[{ flex: 1 }, style]}
      contentContainerStyle={contentStyle(contentContainerStyle, sticky)}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={scrollEnabledProp && !locked}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            haptic("medium");
            void onRefresh();
          }}
          tintColor={colors.yellow}
          colors={[colors.yellow]}
          enabled={!locked}
        />
      }
    >
      {children}
    </ScrollView>
  );
}

function HistoryPullScroll({
  onOpen,
  historyLabel,
  indicatorInsetTop = 0,
  children,
  style,
  contentContainerStyle,
  stickyHeaderIndices,
  removeClippedSubviews,
  onScroll,
  scrollEnabled: scrollEnabledProp = true,
  variant: _,
  ...scrollProps
}: HistoryVariantProps) {
  const sticky = Boolean(stickyHeaderIndices && stickyHeaderIndices.length > 0);
  const {
    overlayLocked,
    tracking,
    scrollEnabled,
    pastThreshold,
    pullPx,
    pullArmed,
    panHandlers,
    noteScrollY,
    shiftStyle,
  } = useHistoryPull(onOpen);
  const hosted = useHistoryChromeSlot(pullPx, historyLabel, pastThreshold, indicatorInsetTop);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      noteScrollY(e.nativeEvent.contentOffset.y);
      onScroll?.(e);
    },
    [noteScrollY, onScroll],
  );

  return (
    <View
      className="relative flex-1 bg-void"
      style={{ backgroundColor: colors.void }}
      {...(pullArmed ? panHandlers : {})}
    >
      {hosted ? null : (
        <HistoryPullChrome
          pullPx={pullPx}
          historyLabel={historyLabel}
          pastThreshold={pastThreshold}
          insetTop={indicatorInsetTop}
        />
      )}
      <Animated.View
        className="flex-1 bg-void"
        style={[{ backgroundColor: colors.void }, shiftStyle]}
      >
        <ScrollView
          {...scrollProps}
          stickyHeaderIndices={stickyHeaderIndices}
          removeClippedSubviews={removeClippedSubviews ?? (sticky ? false : undefined)}
          style={[{ flex: 1, backgroundColor: colors.void }, style]}
          contentContainerStyle={contentStyle(contentContainerStyle, sticky)}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabledProp && scrollEnabled && !overlayLocked}
          onScroll={handleScroll}
          scrollEventThrottle={scrollProps.scrollEventThrottle ?? 16}
          bounces={!tracking && !overlayLocked}
          overScrollMode="never"
        >
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function RefreshPullList<T>({
  refreshing = false,
  onRefresh,
  style,
  contentContainerStyle,
  removeClippedSubviews,
  scrollEnabled: scrollEnabledProp = true,
  listRef,
  variant: _,
  ...listProps
}: ListRefreshProps<T>) {
  const { locked } = useOverlayLock();
  return (
    <FlatList
      ref={listRef}
      {...listProps}
      removeClippedSubviews={removeClippedSubviews}
      style={[{ flex: 1 }, style]}
      contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={scrollEnabledProp && !locked}
      {...(onRefresh
        ? {
            refreshControl: (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  haptic("medium");
                  void onRefresh();
                }}
                tintColor={colors.yellow}
                colors={[colors.yellow]}
                enabled={!locked}
              />
            ),
          }
        : {})}
    />
  );
}

function HistoryPullList<T>({
  onOpen,
  historyLabel,
  indicatorInsetTop = 0,
  style,
  contentContainerStyle,
  removeClippedSubviews,
  onScroll,
  scrollEnabled: scrollEnabledProp = true,
  scrollEventThrottle,
  listRef,
  variant: _,
  ...listProps
}: ListHistoryProps<T>) {
  const {
    overlayLocked,
    tracking,
    scrollEnabled,
    pastThreshold,
    pullPx,
    pullArmed,
    panHandlers,
    noteScrollY,
    shiftStyle,
  } = useHistoryPull(onOpen);
  const hosted = useHistoryChromeSlot(pullPx, historyLabel, pastThreshold, indicatorInsetTop);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      noteScrollY(e.nativeEvent.contentOffset.y);
      onScroll?.(e);
    },
    [noteScrollY, onScroll],
  );

  return (
    <View
      className="relative flex-1 bg-void"
      style={{ backgroundColor: colors.void }}
      {...(pullArmed ? panHandlers : {})}
    >
      {hosted ? null : (
        <HistoryPullChrome
          pullPx={pullPx}
          historyLabel={historyLabel}
          pastThreshold={pastThreshold}
          insetTop={indicatorInsetTop}
        />
      )}
      <Animated.View
        className="flex-1 bg-void"
        style={[{ backgroundColor: colors.void }, shiftStyle]}
      >
        <FlatList
          ref={listRef}
          {...listProps}
          removeClippedSubviews={removeClippedSubviews}
          style={[{ flex: 1, backgroundColor: colors.void }, style]}
          contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabledProp && scrollEnabled && !overlayLocked}
          onScroll={handleScroll}
          scrollEventThrottle={scrollEventThrottle ?? 16}
          bounces={!tracking && !overlayLocked}
          overScrollMode="never"
        />
      </Animated.View>
    </View>
  );
}
