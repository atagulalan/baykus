/// <reference types="nativewind/types" />
import { History } from "lucide-react-native";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { OverlayLockProvider, useOverlayLock } from "../lib/overlayLock.tsx";
import { colors } from "../tokens.ts";

/** E132 / E160 gesture tuning — match web PullToRefresh. */
const PULL_RESISTANCE = 2.5;
const PULL_THRESHOLD_PX = 60;
const PULL_MAX_PX = 96;
const LOCK_SLOP_PX = 10;

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

type ListRefreshProps<T> = Omit<FlatListProps<T>, "refreshControl"> &
  ListNativeWind & {
    variant?: "refresh";
    refreshing: boolean;
    onRefresh: () => void | Promise<void>;
  };

type ListHistoryProps<T> = Omit<FlatListProps<T>, "refreshControl"> &
  ListNativeWind & {
    variant: "history";
    onOpen: () => void;
    historyLabel: string;
    /** See `PullToRefreshProps` history variant. */
    indicatorInsetTop?: number;
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

function setPullDistance(
  dy: number,
  pullPxRef: { current: number },
  setPullPx: (px: number) => void,
) {
  const px = Math.max(0, Math.min(dy / PULL_RESISTANCE, PULL_MAX_PX));
  pullPxRef.current = px;
  setPullPx(px);
}

function useHistoryPull(onOpen: () => void) {
  const { locked: overlayLocked } = useOverlayLock();
  const [pullPx, setPullPx] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const pullPxRef = useRef(0);
  const scrollYRef = useRef(0);
  const gestureLockedRef = useRef(false);
  const overlayLockedRef = useRef(overlayLocked);
  overlayLockedRef.current = overlayLocked;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  const collapse = useCallback(() => {
    pullPxRef.current = 0;
    setPullPx(0);
    setTracking(false);
    gestureLockedRef.current = false;
    setScrollEnabled(true);
  }, []);

  const release = useCallback(() => {
    const shouldOpen = gestureLockedRef.current && pullPxRef.current >= PULL_THRESHOLD_PX;
    collapse();
    if (shouldOpen) onOpenRef.current();
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
          setPullDistance(gesture.dy, pullPxRef, setPullPx);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: release,
        onPanResponderTerminate: collapse,
      }),
    [collapse, release],
  );

  useEffect(() => () => collapse(), [collapse]);

  useEffect(() => {
    if (overlayLocked) collapse();
  }, [overlayLocked, collapse]);

  const noteScrollY = useCallback((y: number) => {
    scrollYRef.current = y;
  }, []);

  return {
    overlayLocked,
    pullPx,
    tracking,
    scrollEnabled,
    pullArmed: !overlayLocked,
    panHandlers: panResponder.panHandlers,
    noteScrollY,
  } as const;
}

function HistoryPullChrome({
  pullPx,
  historyLabel,
  insetTop = 0,
}: {
  pullPx: number;
  historyLabel: string;
  insetTop?: number;
}) {
  const past = pullPx >= PULL_THRESHOLD_PX;
  const opacity = Math.min(pullPx / PULL_THRESHOLD_PX, 1);
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="absolute inset-x-0 z-10 items-center justify-center"
      style={{ top: insetTop, height: pullPx, opacity }}
    >
      <View className="flex-row items-center justify-center gap-2">
        <History size={18} color={past ? colors.yellow : colors.muted} strokeWidth={1.75} />
        <Text className={`text-xs ${past ? "text-yellow" : "text-muted"}`}>{historyLabel}</Text>
      </View>
    </View>
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
  const { overlayLocked, pullPx, tracking, scrollEnabled, pullArmed, panHandlers, noteScrollY } =
    useHistoryPull(onOpen);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      noteScrollY(e.nativeEvent.contentOffset.y);
      onScroll?.(e);
    },
    [noteScrollY, onScroll],
  );

  return (
    <View className="relative flex-1" {...(pullArmed ? panHandlers : {})}>
      <HistoryPullChrome
        pullPx={pullPx}
        historyLabel={historyLabel}
        insetTop={indicatorInsetTop}
      />
      <ScrollView
        {...scrollProps}
        stickyHeaderIndices={stickyHeaderIndices}
        removeClippedSubviews={removeClippedSubviews ?? (sticky ? false : undefined)}
        style={[{ flex: 1 }, style]}
        contentContainerStyle={[
          contentStyle(contentContainerStyle, sticky),
          pullPx > 0 ? { paddingTop: pullPx } : null,
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabledProp && scrollEnabled && !overlayLocked}
        onScroll={handleScroll}
        scrollEventThrottle={scrollProps.scrollEventThrottle ?? 16}
        bounces={!tracking && !overlayLocked}
        overScrollMode="never"
      >
        {children}
      </ScrollView>
    </View>
  );
}

function RefreshPullList<T>({
  refreshing,
  onRefresh,
  style,
  contentContainerStyle,
  removeClippedSubviews,
  scrollEnabled: scrollEnabledProp = true,
  variant: _,
  ...listProps
}: ListRefreshProps<T>) {
  const { locked } = useOverlayLock();
  return (
    <FlatList
      {...listProps}
      removeClippedSubviews={removeClippedSubviews}
      style={[{ flex: 1 }, style]}
      contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={scrollEnabledProp && !locked}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void onRefresh();
          }}
          tintColor={colors.yellow}
          colors={[colors.yellow]}
          enabled={!locked}
        />
      }
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
  variant: _,
  ...listProps
}: ListHistoryProps<T>) {
  const { overlayLocked, pullPx, tracking, scrollEnabled, pullArmed, panHandlers, noteScrollY } =
    useHistoryPull(onOpen);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      noteScrollY(e.nativeEvent.contentOffset.y);
      onScroll?.(e);
    },
    [noteScrollY, onScroll],
  );

  return (
    <View className="relative flex-1" {...(pullArmed ? panHandlers : {})}>
      <HistoryPullChrome
        pullPx={pullPx}
        historyLabel={historyLabel}
        insetTop={indicatorInsetTop}
      />
      <FlatList
        {...listProps}
        removeClippedSubviews={removeClippedSubviews}
        style={[{ flex: 1 }, style]}
        contentContainerStyle={[
          { flexGrow: 1 },
          contentContainerStyle,
          pullPx > 0 ? { paddingTop: pullPx } : null,
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabledProp && scrollEnabled && !overlayLocked}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle ?? 16}
        bounces={!tracking && !overlayLocked}
        overScrollMode="never"
      />
    </View>
  );
}
