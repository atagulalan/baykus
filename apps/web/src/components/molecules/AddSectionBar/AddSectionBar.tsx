import { GripVertical, Plus, SlidersHorizontal, X } from "lucide-react";
import { type PointerEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CATEGORY_ORDER, type WatchCategory } from "../../../api/types.ts";
import { CATEGORY_ICONS } from "../../../lib/categoryIcons.ts";
import type { LibrarySort } from "../../../lib/librarySort.ts";
import { sectionSort, sortsForCategory } from "../../../lib/uiPrefs.ts";
import { Modal } from "../Modal/Modal.tsx";

interface AddSectionBarProps {
  sections: readonly WatchCategory[];
  sectionSorts: Partial<Record<WatchCategory, LibrarySort>>;
  onSectionsChange: (sections: WatchCategory[]) => void;
  onSortChange: (category: WatchCategory, sort: LibrarySort) => void;
}

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

/** Bottom of browse — manage category sections: order, sort, add, remove. */
export function AddSectionBar({
  sections,
  sectionSorts,
  onSectionsChange,
  onSortChange,
}: AddSectionBarProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  const available = CATEGORY_ORDER.filter((c) => c !== "needs_review" && !sections.includes(c));

  function dropIndexAt(clientY: number): number {
    for (let i = 0; i < sections.length; i++) {
      const el = rowRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return Math.max(0, sections.length - 1);
  }

  function startDrag(index: number, e: PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragIndex(index);
    setOverIndex(index);
  }

  function moveDrag(e: PointerEvent<HTMLButtonElement>) {
    if (dragIndex === null) return;
    setOverIndex(dropIndexAt(e.clientY));
  }

  function endDrag() {
    if (dragIndex !== null && overIndex !== null) {
      onSectionsChange(reorderSections(sections, dragIndex, overIndex));
    }
    setDragIndex(null);
    setOverIndex(null);
  }

  function removeSection(category: WatchCategory) {
    if (!isRemovable(category)) return;
    onSectionsChange(sections.filter((c) => c !== category));
  }

  function addSection(category: WatchCategory) {
    onSectionsChange([...sections, category]);
  }

  return (
    <div className="list-inset flex justify-center pt-3 pb-5">
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
        {t("watch.manageSections")}
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        desktop="modal"
        title={t("watch.manageSectionsTitle")}
        className="flex max-h-[min(70vh,32rem)] flex-col gap-4 overflow-y-auto p-4"
      >
        <ul className="flex flex-col gap-2">
          {sections.map((category, index) => {
            const Icon = CATEGORY_ICONS[category];
            const sortOptions = sortsForCategory(category);
            const currentSort = sectionSort(sectionSorts, category);
            const removable = isRemovable(category);
            const isDragging = dragIndex === index;
            const isDropTarget = dragIndex !== null && overIndex === index && dragIndex !== index;

            return (
              <li
                key={category}
                ref={(el) => {
                  rowRefs.current[index] = el;
                }}
                data-section-row
                className={`flex items-center gap-2 rounded-xl border bg-white/[0.02] px-2 py-2 transition-[border-color,opacity,transform,box-shadow] ${
                  isDragging
                    ? "scale-[0.98] border-yellow/30 opacity-50"
                    : isDropTarget
                      ? "border-yellow/40 shadow-[0_0_0_1px_rgba(250,204,21,0.15)]"
                      : "border-white/8"
                }`}
              >
                <button
                  type="button"
                  aria-label={t("watch.reorderSection", { category: t(`category.${category}`) })}
                  className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted/50 transition-colors hover:bg-white/5 hover:text-muted active:cursor-grabbing"
                  onPointerDown={(e) => startDrag(index, e)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  <GripVertical size={15} strokeWidth={1.75} />
                </button>

                <Icon size={16} strokeWidth={1.75} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate text-sm text-snow">
                  {t(`category.${category}`)}
                </span>

                {sortOptions.length > 0 ? (
                  <label className="sr-only" htmlFor={`section-sort-${category}`}>
                    {t("library.filter.sortTitle")}
                  </label>
                ) : null}
                {sortOptions.length > 0 ? (
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
                ) : null}

                {removable ? (
                  <button
                    type="button"
                    onClick={() => removeSection(category)}
                    aria-label={t("watch.removeSection")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X size={16} strokeWidth={1.75} />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>

        {available.length > 0 ? (
          <div className="border-t border-white/5 pt-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
              {t("watch.manageSectionsAddHeading")}
            </p>
            <ul className="flex flex-col gap-1">
              {available.map((category) => {
                const Icon = CATEGORY_ICONS[category];
                return (
                  <li key={category}>
                    <button
                      type="button"
                      onClick={() => addSection(category)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm text-snow transition-colors hover:bg-white/5"
                    >
                      <Plus size={14} strokeWidth={1.75} className="shrink-0 text-muted" />
                      <Icon size={16} strokeWidth={1.75} className="shrink-0 text-muted" />
                      {t(`category.${category}`)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
