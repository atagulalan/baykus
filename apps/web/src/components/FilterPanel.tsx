import { ListFilter } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { CATEGORY_ORDER, type WatchCategory } from "../api/types.ts";
import { CATEGORY_ICONS } from "../lib/categoryIcons.ts";
import { Z } from "../lib/zIndex.ts";
import { Modal } from "./Modal.tsx";

export type LibrarySort = "lastWatched" | "added" | "title" | "rating" | "nextAir";
export type LibraryCategoryFilter = WatchCategory[];

export const DEFAULT_LIBRARY_SORT: LibrarySort = "lastWatched";
export const DEFAULT_LIBRARY_CATEGORY: LibraryCategoryFilter = [];

const SORTS: LibrarySort[] = ["lastWatched", "added", "title", "rating", "nextAir"];

export interface LibraryBrowsePatch {
  sort: LibrarySort;
  category: LibraryCategoryFilter;
}

/** E70: the FAB's active-filter dot — on whenever sort/category differ from the defaults. */
export function hasActiveFilter(sort: LibrarySort, category: LibraryCategoryFilter): boolean {
  return sort !== DEFAULT_LIBRARY_SORT || category.length > 0;
}

interface FilterPanelProps {
  sort: LibrarySort;
  category: LibraryCategoryFilter;
  onApply: (next: LibraryBrowsePatch) => void;
}

function FilterForm({
  draftSort,
  setDraftSort,
  draftCategory,
  setDraftCategory,
}: {
  draftSort: LibrarySort;
  setDraftSort: (s: LibrarySort) => void;
  draftCategory: LibraryCategoryFilter;
  setDraftCategory: (c: LibraryCategoryFilter) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 w-full border-b border-white/5 pb-2 font-mono text-xs text-yellow tracking-widest uppercase">
          {t("library.filter.sortTitle")}
        </legend>
        {SORTS.map((s) => (
          <label key={s} className="flex cursor-pointer items-center gap-3 text-sm text-snow">
            <input
              type="radio"
              name="library-sort"
              checked={draftSort === s}
              onChange={() => setDraftSort(s)}
              className="h-4 w-4 accent-yellow"
            />
            {t(`library.sort.${s}`)}
          </label>
        ))}
      </fieldset>
      <fieldset className="mt-6 flex flex-col gap-3">
        <legend className="mb-2 w-full border-b border-white/5 pb-2 font-mono text-xs text-yellow tracking-widest uppercase">
          {t("library.filter.progressTitle")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_ORDER.map((c: WatchCategory) => {
            const Icon = CATEGORY_ICONS[c];
            const isSelected = draftCategory.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setDraftCategory(draftCategory.filter((cat) => cat !== c));
                  } else {
                    setDraftCategory([...draftCategory, c]);
                  }
                }}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? "border-yellow bg-yellow text-[#080808]"
                    : "border-white/10 bg-[#101010] text-snow hover:border-white/20 hover:bg-white/5"
                }`}
              >
                <Icon size={14} />
                <span>{t(`category.${c}`)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}

/** E128: floating FAB for Library / AllSeries (sort + progress). Watch uses per-section controls (E141). */
export function FilterPanel({ sort, category, onApply }: FilterPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draftSort, setDraftSort] = useState<LibrarySort>(sort);
  const [draftCategory, setDraftCategory] = useState<LibraryCategoryFilter>(category);

  function openPanel() {
    setDraftSort(sort);
    setDraftCategory(category);
    setOpen(true);
  }

  function apply() {
    onApply({ sort: draftSort, category: draftCategory });
    setOpen(false);
  }

  function reset() {
    setDraftSort(DEFAULT_LIBRARY_SORT);
    setDraftCategory(DEFAULT_LIBRARY_CATEGORY);
  }

  const activeDot = hasActiveFilter(sort, category);

  return (
    <>
      {createPortal(
        <button
          type="button"
          onClick={openPanel}
          aria-label={t("library.filter.title")}
          style={{ viewTransitionName: "filter-fab", zIndex: Z.sticky }}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-6 flex h-14 w-14 items-center justify-center rounded-full bg-yellow text-[#080808] shadow-2xl sm:bottom-6"
        >
          <ListFilter size={32} strokeWidth={1.75} />
          {activeDot && (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#080808]"
            />
          )}
        </button>,
        document.body,
      )}

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        desktop="modal"
        title={t("library.filter.title")}
        className="p-6"
      >
        <FilterForm
          draftSort={draftSort}
          setDraftSort={setDraftSort}
          draftCategory={draftCategory}
          setDraftCategory={setDraftCategory}
        />
        <div className="mt-8 flex justify-end gap-3 border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={reset}
            className="border border-white/10 px-3 py-2 font-mono text-[10px] tracking-widest text-muted uppercase transition-colors hover:border-white/20 hover:text-snow"
          >
            {t("library.filter.reset")}
          </button>
          <button
            type="button"
            onClick={apply}
            className="bg-yellow px-4 py-2 font-mono text-[10px] tracking-widest text-[#080808] uppercase transition-opacity hover:opacity-90"
          >
            {t("library.filter.apply")}
          </button>
        </div>
      </Modal>
    </>
  );
}
