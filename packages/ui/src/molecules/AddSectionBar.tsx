/// <reference types="nativewind/types" />
import {
  Check,
  ChevronDown,
  GripVertical,
  Pin,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  type GestureResponderEvent,
  Pressable,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { borders } from "../lib/borders.ts";
import type { WatchCategory } from "../lib/categoryColors.ts";
import { CATEGORY_ICONS } from "../lib/categoryIcons.ts";
import { cn } from "../lib/cn.ts";
import { reorderCombined } from "../lib/reorderSections.ts";
import { SECTION_REORDER_LONG_PRESS_MS, useSectionReorder } from "../lib/useSectionReorder.ts";
import { visualIndex } from "../lib/visualIndex.ts";
import { colors } from "../tokens.ts";
import { Modal } from "./Modal.tsx";
import type { LibrarySort } from "./SortMenu.tsx";

const DEFAULT_CATEGORY_ORDER: WatchCategory[] = [
  "needs_review",
  "watching",
  "up_to_date",
  "not_watched_recently",
  "not_started",
  "watch_later",
  "finished",
  "stopped",
];

export { reorderCombined, reorderSections } from "../lib/reorderSections.ts";

function isRemovable(category: WatchCategory): boolean {
  return category !== "watching" && category !== "needs_review";
}

const ROW_ACTIVE: ViewStyle = {
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.08)",
  borderStyle: "solid",
  backgroundColor: "rgba(255, 255, 255, 0.02)",
};

const ROW_DIMMED: ViewStyle = {
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.1)",
  borderStyle: "dashed",
  backgroundColor: "rgba(255, 255, 255, 0.01)",
};

const ROW_PLACEHOLDER: ViewStyle = {
  borderWidth: 1,
  borderColor: "rgba(250, 204, 21, 0.3)",
  borderStyle: "dashed",
  backgroundColor: "rgba(250, 204, 21, 0.04)",
};

const ROW_GHOST: ViewStyle = {
  borderWidth: 1,
  borderColor: "rgba(250, 204, 21, 0.45)",
  borderStyle: "solid",
  backgroundColor: "#141414",
};

type RightAction = "remove" | "pinned" | "add" | "none";

export type AddSectionBarLabels = {
  trigger: string;
  title: string;
  hint?: string;
  /** a11y / sheet title for the compact sort control (web `library.filter.sortTitle`). */
  sortMenu: string;
  categoryLabel: (category: WatchCategory) => string;
  sortLabel: (sort: LibrarySort) => string;
  remove: string;
  add: string;
  pinned: string;
  /** a11y: long-press drag affordance (`watch.reorderSection`). */
  reorder?: (category: WatchCategory) => string;
  /** Optional a11y actions when VoiceOver cannot drag. */
  moveUp?: string;
  moveDown?: string;
};

export type AddSectionBarProps = {
  sections: readonly WatchCategory[];
  sectionSorts: Partial<Record<WatchCategory, LibrarySort>>;
  onSortChange: (category: WatchCategory, sort: LibrarySort) => void;
  onSectionsChange?: (sections: WatchCategory[]) => void;
  /** When true, only sort options (no add/remove/reorder). */
  sortOnly?: boolean;
  /** Allowed sorts per category; empty = hide sort UI for that row. */
  sortsForCategory: (category: WatchCategory) => LibrarySort[];
  /** Full catalog for "available" rows (defaults to built-in order). */
  categoryOrder?: readonly WatchCategory[];
  labels: AddSectionBarLabels;
  className?: string;
};

function SortOptionList({
  category,
  currentSort,
  sortOptions,
  onSortChange,
  sortLabel,
  a11yLabel,
}: {
  category: WatchCategory;
  currentSort: LibrarySort;
  sortOptions: LibrarySort[];
  onSortChange: (category: WatchCategory, sort: LibrarySort) => void;
  sortLabel: (sort: LibrarySort) => string;
  a11yLabel: string;
}) {
  return (
    <View accessibilityRole="list" accessibilityLabel={a11yLabel} className="gap-0.5">
      {sortOptions.map((sort) => {
        const selected = sort === currentSort;
        return (
          <Pressable
            key={sort}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSortChange(category, sort)}
            className={cn(
              "flex-row items-center justify-between rounded-lg px-3 py-2",
              selected ? "bg-white/5" : "active:bg-white/5",
            )}
          >
            <Text className={cn("font-mono text-xs", selected ? "text-yellow" : "text-snow")}>
              {sortLabel(sort)}
            </Text>
            {selected ? <Check size={14} color={colors.yellow} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

type RowChromeProps = {
  category: WatchCategory;
  dimmed: boolean;
  currentSort: LibrarySort;
  sortOptions: LibrarySort[];
  sortExpanded: boolean;
  rightAction: RightAction;
  labels: AddSectionBarLabels;
  /** When set, grip+label become the long-press drag handle. */
  dragHandle?: {
    a11yLabel: string;
    a11yHint?: string;
    a11yActions?: { name: string; label: string }[];
    onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void;
    onLongPress: () => void;
    disabled?: boolean;
  };
  onToggleSort: () => void;
  onRemove: () => void;
  onAdd: () => void;
};

function ManageRowChrome({
  category,
  dimmed,
  currentSort,
  sortOptions,
  sortExpanded,
  rightAction,
  labels,
  dragHandle,
  onToggleSort,
  onRemove,
  onAdd,
}: RowChromeProps) {
  const Icon = CATEGORY_ICONS[category];
  const gripColor = dimmed ? "rgba(136,136,136,0.4)" : "rgba(136,136,136,0.5)";

  const identity = (
    <>
      <View className="h-9 w-7 shrink-0 items-center justify-center">
        <GripVertical size={15} color={gripColor} strokeWidth={1.75} />
      </View>
      <Icon size={16} color={dimmed ? "rgba(136,136,136,0.7)" : colors.muted} strokeWidth={1.75} />
      <Text
        className={cn("min-w-0 flex-1 text-sm", dimmed ? "text-muted" : "text-snow")}
        numberOfLines={1}
      >
        {labels.categoryLabel(category)}
      </Text>
    </>
  );

  return (
    <View className="flex-row items-center gap-2">
      {dragHandle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dragHandle.a11yLabel}
          {...(dragHandle.a11yHint ? { accessibilityHint: dragHandle.a11yHint } : {})}
          {...(dragHandle.a11yActions ? { accessibilityActions: dragHandle.a11yActions } : {})}
          {...(dragHandle.onAccessibilityAction
            ? { onAccessibilityAction: dragHandle.onAccessibilityAction }
            : {})}
          delayLongPress={SECTION_REORDER_LONG_PRESS_MS}
          onLongPress={dragHandle.onLongPress}
          disabled={dragHandle.disabled}
          // Stable press affordance — default opacity flicker reads as shake while holding.
          android_ripple={null}
          style={{ opacity: 1 }}
          className="min-w-0 flex-1 flex-row items-center gap-2"
        >
          {identity}
        </Pressable>
      ) : (
        <View className="min-w-0 flex-1 flex-row items-center gap-2">{identity}</View>
      )}

      {sortOptions.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels.sortMenu}
          accessibilityState={{ expanded: sortExpanded }}
          onPress={onToggleSort}
          className="max-w-[7.5rem] flex-row items-center gap-1 rounded-lg bg-void/80 px-2 py-1.5 active:bg-white/5"
          style={borders.subtle}
        >
          <Text
            numberOfLines={1}
            className="min-w-0 shrink font-mono text-[10px] uppercase tracking-wide text-muted"
          >
            {labels.sortLabel(currentSort)}
          </Text>
          <ChevronDown size={12} color={colors.muted} />
        </Pressable>
      ) : null}

      {rightAction === "remove" ? (
        <Pressable
          accessibilityLabel={labels.remove}
          onPress={onRemove}
          className="h-8 w-8 shrink-0 items-center justify-center rounded-lg active:bg-red-500/10"
        >
          <X size={16} color={colors.muted} strokeWidth={1.75} />
        </Pressable>
      ) : rightAction === "add" ? (
        <Pressable
          accessibilityLabel={labels.add}
          onPress={onAdd}
          className="h-8 w-8 shrink-0 items-center justify-center rounded-lg active:bg-yellow/10"
        >
          <Plus size={16} color={colors.muted} strokeWidth={1.75} />
        </Pressable>
      ) : rightAction === "pinned" ? (
        <View
          accessibilityRole="image"
          accessibilityLabel={labels.pinned}
          className="h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        >
          <Pin size={14} color="rgba(136,136,136,0.5)" strokeWidth={1.75} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Manage watch/library sections — web bottomsheet parity (grip, pin, compact sort).
 * Long-press a row to drag-reorder (web pointer-drag equivalent).
 */
export function AddSectionBar({
  sections,
  sectionSorts,
  onSortChange,
  onSectionsChange,
  sortOnly = false,
  sortsForCategory,
  categoryOrder = DEFAULT_CATEGORY_ORDER,
  labels,
  className,
}: AddSectionBarProps) {
  const [open, setOpen] = useState(false);
  const [expandedSort, setExpandedSort] = useState<WatchCategory | null>(null);
  /** Last touch page coords — long-press doesn't include them on all platforms. */
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  const modalSections = useMemo(
    () =>
      sortOnly ? sections.filter((category) => sortsForCategory(category).length > 0) : sections,
    [sortOnly, sections, sortsForCategory],
  );

  const available = useMemo(
    () => categoryOrder.filter((c) => c !== "needs_review" && !sections.includes(c)),
    [categoryOrder, sections],
  );

  const combined = useMemo<WatchCategory[]>(
    () => (sortOnly ? [...modalSections] : [...sections, ...available]),
    [sortOnly, modalSections, sections, available],
  );
  const combinedKeys = useMemo(() => combined.map(String), [combined]);

  const commitReorder = useCallback(
    (from: number, to: number) => {
      onSectionsChange?.(reorderCombined(combined, sections.length, from, to));
    },
    [onSectionsChange, combined, sections.length],
  );

  const reorder = useSectionReorder(combinedKeys, commitReorder);
  draggingRef.current = reorder.isDragging;

  const draggedCategory =
    !sortOnly && reorder.dragIndex !== null ? combined[reorder.dragIndex] : undefined;

  function rightActionFor(category: WatchCategory, isActive: boolean): RightAction {
    if (sortOnly) return "none";
    if (!isActive) return "add";
    return isRemovable(category) ? "remove" : "pinned";
  }

  function closeSheet() {
    if (reorder.isDragging) reorder.endDrag();
    setExpandedSort(null);
    setOpen(false);
  }

  function moveA11y(category: WatchCategory, dir: -1 | 1) {
    if (!onSectionsChange || sortOnly) return;
    const idx = combined.indexOf(category);
    if (idx < 0) return;
    onSectionsChange(reorderCombined(combined, sections.length, idx, idx + dir));
  }

  function onRowTouchStart(e: GestureResponderEvent) {
    const { pageX, pageY } = e.nativeEvent;
    lastTouchRef.current = { x: pageX, y: pageY };
  }

  function onRowTouchMove(e: GestureResponderEvent) {
    const { pageX, pageY } = e.nativeEvent;
    lastTouchRef.current = { x: pageX, y: pageY };
    if (draggingRef.current) reorder.moveDrag(pageX, pageY);
  }

  function onRowTouchEnd() {
    if (draggingRef.current) reorder.endDrag();
  }

  function startRowDrag(sourceIndex: number, category: WatchCategory) {
    const { x, y } = lastTouchRef.current;
    reorder.beginDrag(sourceIndex, category, x, y);
  }

  return (
    <View className={cn(sortOnly ? "items-end" : "items-center py-3", className)}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        className="min-h-10 flex-row items-center gap-2 rounded-full bg-white/[0.03] px-5 py-2.5 active:bg-white/[0.06]"
        style={borders.subtle}
      >
        <SlidersHorizontal size={15} color={colors.muted} strokeWidth={1.75} />
        <Text className="text-sm text-muted">{labels.trigger}</Text>
      </Pressable>

      <Modal
        isOpen={open}
        onClose={closeSheet}
        title={labels.title}
        className="gap-3 p-4"
        scrollEnabled={!reorder.isDragging}
      >
        <View className="relative gap-3">
          {labels.hint && !sortOnly ? (
            <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {labels.hint}
            </Text>
          ) : null}

          <View ref={reorder.listRef} collapsable={false} className="relative gap-2">
            {combined.map((category, sourceIndex) => {
              const isActive = sortOnly || sections.includes(category);
              const sortOptions = isActive ? sortsForCategory(category) : [];
              const currentSort = sectionSorts[category] ?? sortOptions[0] ?? "title";
              const dimmed = !sortOnly && !isActive;
              const Icon = CATEGORY_ICONS[category];
              const rightAction = rightActionFor(category, isActive);
              const sortExpanded = expandedSort === category;
              const dragging = !sortOnly && category === draggedCategory;
              const shiftY =
                !sortOnly &&
                reorder.dragIndex !== null &&
                reorder.overIndex !== null &&
                reorder.rowStride > 0
                  ? (visualIndex(sourceIndex, reorder.dragIndex, reorder.overIndex) - sourceIndex) *
                    reorder.rowStride
                  : 0;

              if (sortOnly) {
                return (
                  <View key={category} className="gap-2 rounded-xl px-3 py-2" style={ROW_ACTIVE}>
                    <View className="flex-row items-center gap-2">
                      <Icon size={16} color={colors.muted} strokeWidth={1.75} />
                      <Text className="min-w-0 flex-1 text-sm text-snow" numberOfLines={1}>
                        {labels.categoryLabel(category)}
                      </Text>
                    </View>
                    {sortOptions.length > 0 ? (
                      <SortOptionList
                        category={category}
                        currentSort={currentSort}
                        sortOptions={sortOptions}
                        onSortChange={onSortChange}
                        sortLabel={labels.sortLabel}
                        a11yLabel={`${labels.sortMenu}: ${labels.categoryLabel(category)}`}
                      />
                    ) : null}
                  </View>
                );
              }

              const a11yActions = [
                ...(labels.moveUp && sourceIndex > 0
                  ? [{ name: "moveUp" as const, label: labels.moveUp }]
                  : []),
                ...(labels.moveDown && sourceIndex >= 0 && sourceIndex < combined.length - 1
                  ? [{ name: "moveDown" as const, label: labels.moveDown }]
                  : []),
              ];

              return (
                <View
                  key={category}
                  ref={(el) => reorder.setRowRef(category, el)}
                  collapsable={false}
                  className="rounded-xl px-2 py-2"
                  style={[
                    dragging ? ROW_PLACEHOLDER : dimmed ? ROW_DIMMED : ROW_ACTIVE,
                    shiftY !== 0 ? { transform: [{ translateY: shiftY }] } : null,
                  ]}
                  onTouchStart={onRowTouchStart}
                  onTouchMove={onRowTouchMove}
                  onTouchEnd={onRowTouchEnd}
                  onTouchCancel={onRowTouchEnd}
                >
                  <View {...(dragging ? { className: "opacity-0" as const } : {})}>
                    <ManageRowChrome
                      category={category}
                      dimmed={dimmed}
                      currentSort={currentSort}
                      sortOptions={sortOptions}
                      sortExpanded={sortExpanded}
                      rightAction={rightAction}
                      labels={labels}
                      dragHandle={{
                        a11yLabel: labels.reorder?.(category) ?? labels.categoryLabel(category),
                        ...(labels.hint ? { a11yHint: labels.hint } : {}),
                        ...(a11yActions.length > 0 ? { a11yActions } : {}),
                        onAccessibilityAction: (event) => {
                          if (event.nativeEvent.actionName === "moveUp") {
                            moveA11y(category, -1);
                          }
                          if (event.nativeEvent.actionName === "moveDown") {
                            moveA11y(category, 1);
                          }
                        },
                        onLongPress: () => startRowDrag(sourceIndex, category),
                        disabled: reorder.isDragging,
                      }}
                      onToggleSort={() =>
                        setExpandedSort((prev) => (prev === category ? null : category))
                      }
                      onRemove={() => onSectionsChange?.(sections.filter((c) => c !== category))}
                      onAdd={() => onSectionsChange?.([...sections, category])}
                    />
                  </View>

                  {sortOptions.length > 0 && sortExpanded && !dragging ? (
                    <View className="mt-2">
                      <SortOptionList
                        category={category}
                        currentSort={currentSort}
                        sortOptions={sortOptions}
                        onSortChange={(cat, sort) => {
                          onSortChange(cat, sort);
                          setExpandedSort(null);
                        }}
                        sortLabel={labels.sortLabel}
                        a11yLabel={`${labels.sortMenu}: ${labels.categoryLabel(category)}`}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}

            {draggedCategory && reorder.ghostWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                className="absolute z-50 rounded-xl px-2 py-2"
                style={[
                  ROW_GHOST,
                  {
                    width: reorder.ghostWidth,
                    transform: [{ translateX: reorder.ghostTX }, { translateY: reorder.ghostTY }],
                  },
                ]}
              >
                <ManageRowChrome
                  category={draggedCategory}
                  dimmed={!sections.includes(draggedCategory)}
                  currentSort={
                    sectionSorts[draggedCategory] ?? sortsForCategory(draggedCategory)[0] ?? "title"
                  }
                  sortOptions={
                    sections.includes(draggedCategory) ? sortsForCategory(draggedCategory) : []
                  }
                  sortExpanded={false}
                  rightAction={rightActionFor(draggedCategory, sections.includes(draggedCategory))}
                  labels={labels}
                  onToggleSort={() => {}}
                  onRemove={() => {}}
                  onAdd={() => {}}
                />
              </Animated.View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
