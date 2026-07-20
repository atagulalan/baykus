import { Check, GripVertical, Pin, Plus, SlidersHorizontal, X } from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { CATEGORY_ORDER, type WatchCategory } from "../../../api/types.ts";
import { CATEGORY_ICONS } from "../../../lib/categoryIcons.ts";
import type { LibrarySort } from "../../../lib/librarySort.ts";
import { sectionSort, sortsForCategory } from "../../../lib/uiPrefs.ts";
import { sectionReorderMotion, useSectionReorder } from "../../../lib/useSectionReorder.ts";
import { Modal } from "../Modal/Modal.tsx";

type AddSectionBarBaseProps = {
  sections: readonly WatchCategory[];
  sectionSorts: Partial<Record<WatchCategory, LibrarySort>>;
  onSortChange: (category: WatchCategory, sort: LibrarySort) => void;
  /** Extra classes on the outer trigger wrapper (e.g. header toolbar alignment). */
  className?: string;
};

export type AddSectionBarProps =
  | (AddSectionBarBaseProps & {
      mode?: "manage";
      onSectionsChange: (sections: WatchCategory[]) => void;
    })
  | (AddSectionBarBaseProps & {
      mode: "sortOnly";
    });

function isRemovable(category: WatchCategory): boolean {
  return category !== "watching" && category !== "needs_review";
}

/** Move one section from `from` to `to` index; no-op when out of bounds or unchanged. */
export function reorderSections(
  sections: readonly WatchCategory[],
  from: number,
  to: number,
): WatchCategory[] {
  if (from === to || from < 0 || to < 0 || from >= sections.length || to >= sections.length) {
    return [...sections];
  }
  const next = [...sections];
  const item = next[from];
  if (!item) return [...sections];
  next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Reorder within the combined [active, ...available] list, returning the new active list.
 * Crossing the boundary changes membership: an available row dragged above it becomes
 * active at that slot; an active row dragged below it drops out. Non-removable rows are
 * clamped so they can never leave the active zone.
 */
export function reorderCombined(
  combined: readonly WatchCategory[],
  activeCount: number,
  from: number,
  to: number,
): WatchCategory[] {
  const moved = combined[from];
  if (!moved) return combined.slice(0, activeCount);
  let target = to;
  if (from < activeCount && !isRemovable(moved)) target = Math.min(target, activeCount - 1);
  const next = reorderSections(combined, from, target);
  let newActive = activeCount;
  if (from < activeCount && target >= activeCount) newActive = activeCount - 1;
  else if (from >= activeCount && target < activeCount) newActive = activeCount + 1;
  return next.slice(0, newActive);
}

type RightAction = "remove" | "pinned" | "add" | "none";

type SectionRowContentProps = {
  category: WatchCategory;
  sortOnly: boolean;
  dimmed: boolean;
  currentSort: LibrarySort;
  sortOptions: LibrarySort[];
  rightAction: RightAction;
  onSortChange: (category: WatchCategory, sort: LibrarySort) => void;
  onRemove: (category: WatchCategory) => void;
  onAdd: (category: WatchCategory) => void;
  sortLabel: string;
  removeLabel: string;
  addLabel: string;
  pinnedLabel: string;
};

function SortOptionList({
  category,
  currentSort,
  sortOptions,
  onSortChange,
  sortLabel,
}: {
  category: WatchCategory;
  currentSort: LibrarySort;
  sortOptions: LibrarySort[];
  onSortChange: (category: WatchCategory, sort: LibrarySort) => void;
  sortLabel: string;
}) {
  const { t } = useTranslation();

  return (
    <div
      role="listbox"
      aria-label={`${sortLabel}: ${t(`category.${category}`)}`}
      className="flex flex-col gap-0.5"
    >
      {sortOptions.map((sort) => (
        <button
          key={sort}
          type="button"
          role="option"
          aria-selected={sort === currentSort}
          onClick={() => onSortChange(category, sort)}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-mono text-xs transition-colors ${
            sort === currentSort ? "bg-white/5 text-yellow" : "text-snow hover:bg-white/5"
          }`}
        >
          {t(`library.sort.${sort}`)}
          {sort === currentSort ? (
            <Check size={14} className="shrink-0 text-yellow" aria-hidden />
          ) : null}
        </button>
      ))}
    </div>
  );
}

function SectionRowContent({
  category,
  sortOnly,
  dimmed,
  currentSort,
  sortOptions,
  rightAction,
  onSortChange,
  onRemove,
  onAdd,
  sortLabel,
  removeLabel,
  addLabel,
  pinnedLabel,
}: SectionRowContentProps) {
  const { t } = useTranslation();
  const Icon = CATEGORY_ICONS[category];

  return (
    <>
      {!sortOnly ? (
        <span
          aria-hidden
          className={`flex h-9 w-7 shrink-0 items-center justify-center rounded-lg ${
            dimmed ? "text-muted/40" : "text-muted/50"
          }`}
        >
          <GripVertical size={15} strokeWidth={1.75} />
        </span>
      ) : null}

      <Icon
        size={16}
        strokeWidth={1.75}
        className={`shrink-0 ${dimmed ? "text-muted/70" : "text-muted"}`}
      />
      <span className={`min-w-0 flex-1 truncate text-sm ${dimmed ? "text-muted" : "text-snow"}`}>
        {t(`category.${category}`)}
      </span>

      {sortOptions.length > 0 && !sortOnly ? (
        <>
          <label className="sr-only" htmlFor={`section-sort-${category}`}>
            {sortLabel}
          </label>
          <select
            id={`section-sort-${category}`}
            value={currentSort}
            onChange={(e) => onSortChange(category, e.target.value as LibrarySort)}
            className="max-w-[7.5rem] truncate rounded-lg border border-white/10 bg-void/80 px-2 py-1.5 font-mono text-[10px] text-muted uppercase tracking-wide transition-colors hover:border-white/20 focus:border-yellow/40 focus:text-snow focus:outline-none"
          >
            {sortOptions.map((sort) => (
              <option key={sort} value={sort}>
                {t(`library.sort.${sort}`)}
              </option>
            ))}
          </select>
        </>
      ) : null}

      {rightAction === "remove" ? (
        <button
          type="button"
          onClick={() => onRemove(category)}
          aria-label={removeLabel}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      ) : rightAction === "add" ? (
        <button
          type="button"
          onClick={() => onAdd(category)}
          aria-label={addLabel}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-yellow/10 hover:text-yellow"
        >
          <Plus size={16} strokeWidth={1.75} />
        </button>
      ) : rightAction === "pinned" ? (
        <span
          role="img"
          aria-label={pinnedLabel}
          title={pinnedLabel}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted/50"
        >
          <Pin size={14} strokeWidth={1.75} />
        </span>
      ) : null}
    </>
  );
}

/** Bottom of browse — manage category sections: order, sort, add, remove. */
export function AddSectionBar(props: AddSectionBarProps) {
  const { sections, sectionSorts, onSortChange, className = "" } = props;
  const sortOnly = props.mode === "sortOnly";
  const onSectionsChange = sortOnly ? undefined : props.onSectionsChange;

  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  /** sortOnly: fixed-order buckets (e.g. needs_review) stay on-page but have no sort row. */
  const modalSections = useMemo(
    () =>
      sortOnly ? sections.filter((category) => sortsForCategory(category).length > 0) : sections,
    [sortOnly, sections],
  );

  const available = useMemo(
    () => CATEGORY_ORDER.filter((c) => c !== "needs_review" && !sections.includes(c)),
    [sections],
  );

  /** manage: active rows first, then the not-yet-added categories, all in one draggable list. */
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
  const { slideMs } = sectionReorderMotion;

  const displayCombined =
    !sortOnly && reorder.dragIndex !== null && reorder.overIndex !== null
      ? reorderSections(combined, reorder.dragIndex, reorder.overIndex)
      : combined;

  const draggedCategory =
    !sortOnly && reorder.dragIndex !== null ? combined[reorder.dragIndex] : undefined;

  const triggerLabel = sortOnly ? t("library.filter.sortTitle") : t("watch.manageSections");
  const modalTitle = sortOnly ? t("library.filter.sortTitle") : t("watch.manageSectionsTitle");
  const sortLabel = t("library.filter.sortTitle");
  const removeLabel = t("watch.removeSection");
  const pinnedLabel = t("watch.sectionPinned");

  function removeSection(category: WatchCategory) {
    if (!onSectionsChange || !isRemovable(category)) return;
    onSectionsChange(sections.filter((c) => c !== category));
  }

  function addSection(category: WatchCategory) {
    onSectionsChange?.([...sections, category]);
  }

  function rightActionFor(category: WatchCategory, isActive: boolean): RightAction {
    if (sortOnly) return "none";
    if (!isActive) return "add";
    return isRemovable(category) ? "remove" : "pinned";
  }

  const wrapperClass = sortOnly
    ? `flex shrink-0 justify-end ${className}`.trim()
    : `list-inset flex justify-center pt-3 pb-5 ${className}`.trim();

  let ghostContent: ReactNode = null;
  if (!sortOnly && reorder.ghost && draggedCategory) {
    const isActive = sections.includes(draggedCategory);
    const sortOptions = isActive ? sortsForCategory(draggedCategory) : [];
    ghostContent = createPortal(
      <div
        aria-hidden
        className="pointer-events-none fixed z-[100] flex items-center gap-2 rounded-xl border border-yellow/50 bg-[#121212] px-2 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.55),0_0_0_1px_rgba(250,204,21,0.2)]"
        style={{
          left: reorder.ghost.x,
          top: reorder.ghost.y,
          width: reorder.ghost.width,
          height: reorder.ghost.height,
          transform: "scale(1.02) rotate(-0.4deg)",
        }}
      >
        <SectionRowContent
          category={draggedCategory}
          sortOnly={false}
          dimmed={!isActive}
          currentSort={sectionSort(sectionSorts, draggedCategory)}
          sortOptions={sortOptions}
          rightAction={rightActionFor(draggedCategory, isActive)}
          onSortChange={onSortChange}
          onRemove={removeSection}
          onAdd={addSection}
          sortLabel={sortLabel}
          removeLabel={removeLabel}
          addLabel={t("watch.addSectionNamed", { category: t(`category.${draggedCategory}`) })}
          pinnedLabel={pinnedLabel}
        />
      </div>,
      document.body,
    );
  }

  return (
    <div className={`${wrapperClass} ${sortOnly ? "relative" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-muted shadow-sm backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-snow active:scale-[0.98]"
      >
        <SlidersHorizontal
          size={15}
          strokeWidth={1.75}
          className="text-muted transition-colors group-hover:text-snow"
        />
        {triggerLabel}
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        desktop={sortOnly ? "popover" : "modal"}
        {...(sortOnly ? { popoverClassName: "w-72" } : {})}
        title={modalTitle}
        className="flex max-h-[min(70vh,32rem)] flex-col gap-3 overflow-y-auto p-4"
      >
        {!sortOnly ? (
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {t("watch.manageSectionsHint")}
          </p>
        ) : null}

        <ul ref={sortOnly ? undefined : reorder.listRef} className="flex flex-col gap-2">
          {displayCombined.map((category) => {
            const sourceIndex = combined.indexOf(category);
            const isActive = sortOnly || sections.includes(category);
            const sortOptions = isActive ? sortsForCategory(category) : [];
            const currentSort = sectionSort(sectionSorts, category);
            const dragging = !sortOnly && category === draggedCategory;
            const dimmed = !sortOnly && !isActive;
            const shiftY = sortOnly ? 0 : reorder.rowShift(category);
            const look = dragging
              ? "border-dashed border-yellow/30 bg-yellow/[0.04]"
              : dimmed
                ? "border-dashed border-white/10 bg-white/[0.01]"
                : "border-white/8 bg-white/[0.02]";

            if (sortOnly) {
              return (
                <li
                  key={category}
                  className={`flex flex-col gap-2 rounded-xl border py-2 px-3 ${look}`}
                >
                  <div className="flex items-center gap-2">
                    <SectionRowContent
                      category={category}
                      sortOnly
                      dimmed={false}
                      currentSort={currentSort}
                      sortOptions={sortOptions}
                      rightAction="none"
                      onSortChange={onSortChange}
                      onRemove={removeSection}
                      onAdd={addSection}
                      sortLabel={sortLabel}
                      removeLabel={removeLabel}
                      addLabel={t("watch.addSectionNamed", {
                        category: t(`category.${category}`),
                      })}
                      pinnedLabel={pinnedLabel}
                    />
                  </div>
                  {sortOptions.length > 0 ? (
                    <SortOptionList
                      category={category}
                      currentSort={currentSort}
                      sortOptions={sortOptions}
                      onSortChange={onSortChange}
                      sortLabel={sortLabel}
                    />
                  ) : null}
                </li>
              );
            }

            return (
              <li
                key={category}
                ref={(el) => reorder.setRowRef(category, el)}
                aria-grabbed={dragging || undefined}
                aria-label={t("watch.reorderSection", { category: t(`category.${category}`) })}
                onPointerDown={(e) => reorder.onRowPointerDown(sourceIndex, category, e)}
                className={`relative flex items-center gap-2 rounded-xl border py-2 touch-none cursor-grab px-2 active:cursor-grabbing ${look}`}
                style={{
                  transform: shiftY ? `translateY(${shiftY}px)` : undefined,
                  transition:
                    reorder.isDragging && !shiftY
                      ? `transform ${slideMs}ms cubic-bezier(0.2, 0, 0, 1)`
                      : undefined,
                }}
              >
                <div
                  className={`flex w-full items-center gap-2 ${dragging ? "invisible" : ""}`}
                  aria-hidden={dragging || undefined}
                >
                  <SectionRowContent
                    category={category}
                    sortOnly={false}
                    dimmed={dimmed}
                    currentSort={currentSort}
                    sortOptions={sortOptions}
                    rightAction={rightActionFor(category, isActive)}
                    onSortChange={onSortChange}
                    onRemove={removeSection}
                    onAdd={addSection}
                    sortLabel={sortLabel}
                    removeLabel={removeLabel}
                    addLabel={t("watch.addSectionNamed", {
                      category: t(`category.${category}`),
                    })}
                    pinnedLabel={pinnedLabel}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Modal>

      {ghostContent}
    </div>
  );
}
