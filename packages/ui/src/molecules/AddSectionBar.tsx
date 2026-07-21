/// <reference types="nativewind/types" />
import { Check, Plus, SlidersHorizontal, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { WatchCategory } from "../lib/categoryColors.ts";
import { cn } from "../lib/cn.ts";
import { reorderSections } from "../lib/reorderSections.ts";
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

export { reorderSections } from "../lib/reorderSections.ts";

function isRemovable(category: WatchCategory): boolean {
  return category !== "watching" && category !== "needs_review";
}

export type AddSectionBarLabels = {
  trigger: string;
  title: string;
  hint?: string;
  categoryLabel: (category: WatchCategory) => string;
  sortLabel: (sort: LibrarySort) => string;
  remove: string;
  add: string;
  pinned: string;
  moveUp: string;
  moveDown: string;
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

/**
 * Manage watch/library sections — modal with add/remove/reorder (buttons) + per-section sort.
 * Web drag-reorder stays web-local; native uses up/down controls.
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

  const available = useMemo(
    () => categoryOrder.filter((c) => c !== "needs_review" && !sections.includes(c)),
    [categoryOrder, sections],
  );

  const rows = sortOnly ? [...sections] : [...sections, ...available];

  function move(category: WatchCategory, dir: -1 | 1) {
    if (!onSectionsChange || sortOnly) return;
    const idx = sections.indexOf(category);
    if (idx < 0) return;
    onSectionsChange(reorderSections(sections, idx, idx + dir));
  }

  return (
    <View className={cn(sortOnly ? "items-end" : "items-center py-3", className)}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        className="min-h-10 flex-row items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 active:bg-white/10"
      >
        <SlidersHorizontal size={15} color={colors.muted} />
        <Text className="text-sm text-muted">{labels.trigger}</Text>
      </Pressable>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={labels.title} className="gap-3 p-4">
        {labels.hint && !sortOnly ? (
          <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {labels.hint}
          </Text>
        ) : null}

        <View className="gap-2">
          {rows.map((category) => {
            const isActive = sortOnly || sections.includes(category);
            const sortOptions = isActive ? sortsForCategory(category) : [];
            const currentSort = sectionSorts[category] ?? sortOptions[0] ?? "title";
            const activeIndex = sections.indexOf(category);

            return (
              <View
                key={category}
                className={cn(
                  "gap-2 rounded-xl border px-3 py-2",
                  isActive ? "border-white/10 bg-white/5" : "border-dashed border-white/10",
                )}
              >
                <View className="flex-row items-center gap-2">
                  <Text
                    className={cn("min-w-0 flex-1 text-sm", isActive ? "text-snow" : "text-muted")}
                    numberOfLines={1}
                  >
                    {labels.categoryLabel(category)}
                  </Text>

                  {!sortOnly && isActive ? (
                    <View className="flex-row gap-1">
                      <Pressable
                        accessibilityLabel={labels.moveUp}
                        disabled={activeIndex <= 0}
                        onPress={() => move(category, -1)}
                        className="h-8 w-8 items-center justify-center rounded-lg active:bg-white/5 disabled:opacity-30"
                      >
                        <Text className="font-mono text-xs text-muted">↑</Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={labels.moveDown}
                        disabled={activeIndex < 0 || activeIndex >= sections.length - 1}
                        onPress={() => move(category, 1)}
                        className="h-8 w-8 items-center justify-center rounded-lg active:bg-white/5 disabled:opacity-30"
                      >
                        <Text className="font-mono text-xs text-muted">↓</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {!sortOnly && isActive && isRemovable(category) ? (
                    <Pressable
                      accessibilityLabel={labels.remove}
                      onPress={() =>
                        onSectionsChange?.(sections.filter((c) => c !== category))
                      }
                      className="h-8 w-8 items-center justify-center rounded-lg active:bg-red-500/10"
                    >
                      <X size={16} color={colors.muted} />
                    </Pressable>
                  ) : null}

                  {!sortOnly && !isActive ? (
                    <Pressable
                      accessibilityLabel={labels.add}
                      onPress={() => onSectionsChange?.([...sections, category])}
                      className="h-8 w-8 items-center justify-center rounded-lg active:bg-yellow/10"
                    >
                      <Plus size={16} color={colors.muted} />
                    </Pressable>
                  ) : null}
                </View>

                {sortOptions.length > 0 ? (
                  <View className="gap-0.5">
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
                          <Text
                            className={cn(
                              "font-mono text-xs",
                              selected ? "text-yellow" : "text-snow",
                            )}
                          >
                            {labels.sortLabel(sort)}
                          </Text>
                          {selected ? <Check size={14} color={colors.yellow} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}
