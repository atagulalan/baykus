/// <reference types="nativewind/types" />
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";
import { PullToRefreshList, type PullToRefreshListProps } from "./PullToRefresh.tsx";

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
};

type PullVariant =
  | {
      variant?: "refresh";
      refreshing: boolean;
      onRefresh: () => void | Promise<void>;
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

function SectionHeaderCell({
  sectionKey,
  renderHeader,
  onMeasuredWindowY,
}: {
  sectionKey: string;
  renderHeader: () => ReactNode;
  onMeasuredWindowY: (sectionKey: string, windowY: number) => void;
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
      ref={ref}
      collapsable={false}
      onLayout={report}
      pointerEvents={stuck ? "none" : "auto"}
      style={{ opacity: stuck ? 0 : 1 }}
    >
      {renderHeader()}
    </View>
  );
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
    ...pullProps
  } = props;
  const topSpacer = contentTopSpacer ?? stickyOffset;
  const yByKey = useRef(new Map<string, number>());
  const scrollYRef = useRef(0);
  const listWindowYRef = useRef(0);
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
      if (section.data != null && section.renderItem != null) {
        const extract =
          section.keyExtractor ??
          ((item: unknown, index: number) => {
            if (item != null && typeof item === "object" && "id" in item) {
              return String((item as { id: string | number }).id);
            }
            return String(index);
          });
        section.data.forEach((item, index) => {
          out.push({
            kind: "row",
            key: `r:${section.key}:${extract(item, index)}`,
            sectionKey: section.key,
            item,
            index,
          });
        });
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
          />
        );
      }

      if (cell.kind === "body") {
        return <View collapsable={false}>{section.body}</View>;
      }

      if (cell.kind === "rowsEnd") {
        return <View className={section.rowsClassName ?? "mb-6"} collapsable={false} />;
      }

      return <>{section.renderItem?.({ item: cell.item as T, index: cell.index })}</>;
    },
    [onHeaderMeasuredWindowY, sectionByKey],
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
        className="flex-1"
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
          data={cells}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeaderNode}
          ListFooterComponent={listFooter ?? null}
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
    <View className="flex-1">
      {list}
      {stuckHeader ? (
        <View
          pointerEvents="box-none"
          className={`absolute left-0 right-0 z-30 items-center ${pinClassName ?? ""}`}
          style={{ top: stickyOffset }}
        >
          {stuckHeader}
        </View>
      ) : null}
    </View>
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
