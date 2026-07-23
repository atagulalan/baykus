/// <reference types="nativewind/types" />
import {
  createContext,
  type MutableRefObject,
  type ReactElement,
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
  type FlatList,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";
import {
  HistoryPullChromeHost,
  HistoryPullShift,
  PullToRefreshList,
  type PullToRefreshListProps,
} from "./PullToRefresh.tsx";

export type StickySection<T = unknown> = {
  key: string;
  /** Return a fresh header element each call (in-flow + floating clone). */
  renderHeader?: () => ReactNode;
  /**
   * Opaque section body — one list cell. Fine for skeletons / empty states /
   * small grids. Prefer `data` + `renderItem` for long row lists (virtualized).
   */
  body?: ReactNode;
  /** Virtualized rows for this section (Watch list, etc.). */
  data?: readonly T[];
  renderItem?: (info: { item: T; index: number }) => ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  /** Bottom gap after virtualized rows (replaces AccordionPanel `mb-6`). */
  rowsClassName?: string;
};

/** Imperative scroll / season-pin API for series detail (E176). */
export type StickySectionScrollHandle = {
  scrollToOffset: (params: { offset: number; animated?: boolean }) => void;
  /**
   * Scroll so the section header docks under sticky chrome.
   * Remeasures **all** sticky headers first (accordion/gap height shifts
   * move siblings without firing their `onLayout`), then pins the target.
   * Pass `correctMs > 0` only if a height tween still needs multi-frame correction.
   */
  pinSection: (sectionKey: string, options?: { animated?: boolean; correctMs?: number }) => void;
  /**
   * Refresh content-Y for every mounted sticky header. Call after layout that
   * changes heights above later sections (season accordion, collapsed-gap expand)
   * when automatic body `onLayout` is not enough.
   */
  remesasureHeaders: () => void;
};

type StickyBase<T = unknown> = {
  sections: StickySection<T>[];
  /**
   * Pin line from the top of this scroll surface (wordmark + safe area).
   * The floating pill docks here.
   */
  stickyOffset: number;
  /**
   * Top spacer inside the scroll content so items clear the chrome.
   * Defaults to `stickyOffset`. Pass `0` when the list header already
   * accounts for chrome (e.g. series hero with its own top inset).
   */
  contentTopSpacer?: number;
  listHeader?: ReactNode;
  listFooter?: ReactNode;
  /** Horizontal inset for the floating pin (match content padding). */
  pinClassName?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** NativeWind class on the list content container. */
  contentContainerClassName?: string;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
  /** Imperative scroll / pin API (series detail season expand). */
  scrollRef?: Ref<StickySectionScrollHandle | null>;
};

type PullVariant =
  | {
      variant?: "refresh";
      /** Omit for non-refreshing lists (loading shells, static sections). */
      refreshing?: boolean;
      onRefresh?: () => void | Promise<void>;
    }
  | {
      variant: "history";
      onOpen: () => void;
      historyLabel: string;
    };

export type StickySectionScrollProps<T = unknown> = StickyBase<T> & PullVariant;

type FlatCell =
  | { kind: "header"; key: string; sectionKey: string }
  | { kind: "body"; key: string; sectionKey: string }
  | { kind: "row"; key: string; sectionKey: string; item: unknown; index: number }
  | { kind: "rowsEnd"; key: string; sectionKey: string };

const StuckKeyContext = createContext<string | null>(null);

/**
 * Default: no multi-frame correction storm. Instant season expand (series
 * detail) settles in one layout pass; a single rAF rememeasure is enough.
 * Callers that still height-tween may pass `correctMs` ≈ tween duration.
 */
const DEFAULT_PIN_CORRECT_MS = 0;

function SectionHeaderCell({
  sectionKey,
  renderHeader,
  onMeasuredWindowY,
  headerViewByKey,
}: {
  sectionKey: string;
  renderHeader: () => ReactNode;
  onMeasuredWindowY: (sectionKey: string, windowY: number) => void;
  headerViewByKey: MutableRefObject<Map<string, View>>;
}) {
  const stuckKey = useContext(StuckKeyContext);
  const stuck = stuckKey === sectionKey;
  const ref = useRef<View>(null);

  const report = useCallback(() => {
    ref.current?.measureInWindow((_x, windowY) => {
      onMeasuredWindowY(sectionKey, windowY);
    });
  }, [onMeasuredWindowY, sectionKey]);

  return (
    <View
      ref={(node) => {
        const prev = ref.current;
        ref.current = node;
        if (node) headerViewByKey.current.set(sectionKey, node);
        else if (headerViewByKey.current.get(sectionKey) === prev) {
          headerViewByKey.current.delete(sectionKey);
        }
      }}
      collapsable={false}
      onLayout={report}
      pointerEvents={stuck ? "none" : "auto"}
      style={{ opacity: stuck ? 0 : 1 }}
    >
      {renderHeader()}
    </View>
  );
}

function assignRef<T>(ref: Ref<T | null> | undefined, value: T | null) {
  if (ref == null) return;
  if (typeof ref === "function") ref(value);
  else (ref as MutableRefObject<T | null>).current = value;
}

/**
 * Section pills that stick under the chrome.
 * RN `stickyHeaderIndices` is unreliable on 0.81 / New Arch — we pin a floating clone.
 * Long sections should pass `data` + `renderItem` so rows virtualize on FlatList.
 */
export function StickySectionScroll<T = unknown>(props: StickySectionScrollProps<T>) {
  const {
    sections,
    stickyOffset,
    contentTopSpacer,
    listHeader,
    listFooter,
    pinClassName,
    onScroll,
    scrollEventThrottle = 32,
    contentContainerStyle,
    contentContainerClassName,
    style,
    className,
    scrollRef,
    ...pullProps
  } = props;
  const topSpacer = contentTopSpacer ?? stickyOffset;
  const yByKey = useRef(new Map<string, number>());
  const headerViewByKey = useRef(new Map<string, View>());
  const scrollYRef = useRef(0);
  const listWindowYRef = useRef(0);
  const listRef = useRef<FlatList<FlatCell>>(null);
  const pinGenRef = useRef(0);
  const remesasureGenRef = useRef(0);
  const remesasureRafRef = useRef<number | null>(null);
  const [stuckKey, setStuckKey] = useState<string | null>(null);

  const sectionByKey = useMemo(() => {
    const map = new Map<string, StickySection<T>>();
    for (const s of sections) map.set(s.key, s);
    return map;
  }, [sections]);

  const stickyKeys = useMemo(
    () => sections.filter((s) => s.renderHeader != null).map((s) => s.key),
    [sections],
  );

  const cells = useMemo((): FlatCell[] => {
    const out: FlatCell[] = [];
    for (const section of sections) {
      if (section.renderHeader != null) {
        out.push({ kind: "header", key: `h:${section.key}`, sectionKey: section.key });
      }
      if (Array.isArray(section.data) && section.renderItem != null) {
        const extract =
          section.keyExtractor ??
          ((item: unknown, index: number) => {
            if (item != null && typeof item === "object" && "id" in item) {
              return String((item as { id: string | number }).id);
            }
            return String(index);
          });
        for (let index = 0; index < section.data.length; index++) {
          const item = section.data[index] as T;
          out.push({
            kind: "row",
            key: `r:${section.key}:${extract(item, index)}`,
            sectionKey: section.key,
            item,
            index,
          });
        }
        out.push({ kind: "rowsEnd", key: `e:${section.key}`, sectionKey: section.key });
      } else if (section.body != null) {
        out.push({ kind: "body", key: `b:${section.key}`, sectionKey: section.key });
      }
    }
    return out;
  }, [sections]);

  const pickStuck = useCallback(
    (scrollY: number) => {
      let next: string | null = null;
      for (const key of stickyKeys) {
        const y = yByKey.current.get(key);
        if (y == null) continue;
        if (scrollY >= y - stickyOffset) next = key;
      }
      setStuckKey((prev) => (prev === next ? prev : next));
    },
    [stickyKeys, stickyOffset],
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      scrollYRef.current = y;
      pickStuck(y);
      onScroll?.(e);
    },
    [onScroll, pickStuck],
  );

  const onHeaderMeasuredWindowY = useCallback(
    (key: string, windowY: number) => {
      // FlatList cell onLayout.y is not content-relative — recover content Y via window.
      const contentY = windowY - listWindowYRef.current + scrollYRef.current;
      if (yByKey.current.get(key) === contentY) return;
      yByKey.current.set(key, contentY);
      pickStuck(scrollYRef.current);
    },
    [pickStuck],
  );

  /**
   * FlatList does not re-fire header `onLayout` when a sibling body above
   * changes height (accordion / collapsed-gap). Those headers move in content
   * space while `yByKey` stays stale → wrong floating sticky pill. Remeasure
   * every mounted header; drop Y for unmounted keys so pickStuck cannot stick
   * to ghosts.
   */
  const remesasureAllHeaders = useCallback(
    (onDone?: () => void) => {
      const gen = ++remesasureGenRef.current;
      for (const key of stickyKeys) {
        if (!headerViewByKey.current.has(key)) yByKey.current.delete(key);
      }
      const entries = [...headerViewByKey.current.entries()];
      if (entries.length === 0) {
        pickStuck(scrollYRef.current);
        onDone?.();
        return;
      }
      let left = entries.length;
      for (const [key, header] of entries) {
        header.measureInWindow((_x, windowY) => {
          if (remesasureGenRef.current !== gen) return;
          const contentY = windowY - listWindowYRef.current + scrollYRef.current;
          yByKey.current.set(key, contentY);
          left -= 1;
          if (left <= 0) {
            pickStuck(scrollYRef.current);
            onDone?.();
          }
        });
      }
    },
    [pickStuck, stickyKeys],
  );

  const scheduleRemeasureAllHeaders = useCallback(() => {
    if (remesasureRafRef.current != null) return;
    remesasureRafRef.current = requestAnimationFrame(() => {
      remesasureRafRef.current = null;
      remesasureAllHeaders();
    });
  }, [remesasureAllHeaders]);

  useEffect(() => {
    return () => {
      if (remesasureRafRef.current != null) {
        cancelAnimationFrame(remesasureRafRef.current);
        remesasureRafRef.current = null;
      }
    };
  }, []);

  // Gap expand / section list rebuild inserts or removes headers — refresh map.
  // Depend on a key fingerprint: callers often pass a fresh `sections` array
  // each render, which would otherwise remesasure every paint.
  // Double rAF: FlatList may not have mounted new header cells in the first frame.
  const sectionStructureKey = cells.map((c) => c.key).join("|");
  useEffect(() => {
    scheduleRemeasureAllHeaders();
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        remesasureAllHeaders();
      });
    });
    return () => {
      cancelAnimationFrame(first);
      if (second) cancelAnimationFrame(second);
    };
  }, [sectionStructureKey, scheduleRemeasureAllHeaders, remesasureAllHeaders]);

  const scrollToOffset = useCallback((params: { offset: number; animated?: boolean }) => {
    listRef.current?.scrollToOffset(params);
  }, []);

  const pinSection = useCallback(
    (sectionKey: string, options?: { animated?: boolean; correctMs?: number }) => {
      const animated = options?.animated ?? false;
      const correctMs = options?.correctMs ?? DEFAULT_PIN_CORRECT_MS;
      const gen = ++pinGenRef.current;

      const applyFromContentY = (contentY: number) => {
        const offset = Math.max(0, contentY - stickyOffset);
        listRef.current?.scrollToOffset({ offset, animated });
        scrollYRef.current = offset;
        pickStuck(offset);
      };

      const remesasureThenPin = () => {
        if (pinGenRef.current !== gen) return;
        remesasureAllHeaders(() => {
          if (pinGenRef.current !== gen) return;
          const y = yByKey.current.get(sectionKey);
          if (y != null) applyFromContentY(y);
        });
      };

      remesasureThenPin();
      if (correctMs <= 0) return;

      const started = Date.now();
      const tick = () => {
        if (pinGenRef.current !== gen) return;
        remesasureThenPin();
        if (Date.now() - started < correctMs) {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    },
    [pickStuck, remesasureAllHeaders, stickyOffset],
  );

  useLayoutEffect(() => {
    const handle: StickySectionScrollHandle = {
      scrollToOffset,
      pinSection,
      remesasureHeaders: () => {
        remesasureAllHeaders();
      },
    };
    assignRef(scrollRef, handle);
    return () => assignRef(scrollRef, null);
  }, [pinSection, remesasureAllHeaders, scrollRef, scrollToOffset]);

  const renderItem = useCallback(
    ({ item: cell }: ListRenderItemInfo<FlatCell>) => {
      const section = sectionByKey.get(cell.sectionKey);
      if (!section) return null;

      if (cell.kind === "header") {
        const renderHeader = section.renderHeader;
        if (!renderHeader) return null;
        return (
          <SectionHeaderCell
            sectionKey={cell.sectionKey}
            renderHeader={renderHeader}
            onMeasuredWindowY={onHeaderMeasuredWindowY}
            headerViewByKey={headerViewByKey}
          />
        );
      }

      if (cell.kind === "body") {
        return (
          <View collapsable={false} onLayout={scheduleRemeasureAllHeaders}>
            {section.body}
          </View>
        );
      }

      if (cell.kind === "rowsEnd") {
        return <View className={section.rowsClassName ?? "mb-6"} collapsable={false} />;
      }

      return <>{section.renderItem?.({ item: cell.item as T, index: cell.index })}</>;
    },
    [onHeaderMeasuredWindowY, scheduleRemeasureAllHeaders, sectionByKey],
  );

  const keyExtractor = useCallback((cell: FlatCell) => cell.key, []);

  const listHeaderNode = useMemo(
    () => (
      <>
        <View style={{ height: topSpacer }} collapsable={false} />
        {listHeader}
      </>
    ),
    [listHeader, topSpacer],
  );

  const stuckSection = stuckKey ? sectionByKey.get(stuckKey) : undefined;
  const stuckHeader = stuckSection?.renderHeader?.() ?? null;

  const listAnchorRef = useRef<View>(null);

  const list = (
    <StuckKeyContext.Provider value={stuckKey}>
      <View
        ref={listAnchorRef}
        className="flex-1 bg-void"
        collapsable={false}
        onLayout={() => {
          listAnchorRef.current?.measureInWindow((_x, y) => {
            listWindowYRef.current = y;
          });
        }}
      >
        <PullToRefreshList
          {...(pullProps as PullToRefreshListProps<FlatCell>)}
          {...(pullProps.variant === "history" ? { indicatorInsetTop: topSpacer } : {})}
          listRef={listRef}
          data={cells}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeaderNode}
          {...(listFooter != null
            ? { ListFooterComponent: <View collapsable={false}>{listFooter}</View> }
            : {})}
          onScroll={handleScroll}
          scrollEventThrottle={scrollEventThrottle}
          {...(contentContainerStyle !== undefined ? { contentContainerStyle } : {})}
          {...(contentContainerClassName !== undefined ? { contentContainerClassName } : {})}
          {...(style !== undefined ? { style } : {})}
          {...(className !== undefined ? { className } : {})}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === "android"}
        />
      </View>
    </StuckKeyContext.Provider>
  );

  return (
    <HistoryPullChromeHost>
      <View className="flex-1 bg-void">
        {list}
        {stuckHeader ? (
          <HistoryPullShift
            pointerEvents="box-none"
            className={`absolute left-0 right-0 z-30 items-center ${pinClassName ?? ""}`}
            style={{ top: stickyOffset }}
          >
            {stuckHeader}
          </HistoryPullShift>
        ) : null}
      </View>
    </HistoryPullChromeHost>
  );
}

/** Narrow helper for call sites that build typed section rows. */
export function stickyRows<T>(
  section: Omit<StickySection<T>, "body"> & {
    data: readonly T[];
    renderItem: (info: { item: T; index: number }) => ReactElement | null;
  },
): StickySection<T> {
  return section;
}
