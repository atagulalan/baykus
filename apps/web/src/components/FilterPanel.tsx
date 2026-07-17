import { ListFilter } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CATEGORY_ORDER, type WatchCategory } from "../api/types.ts";
import { CATEGORY_ICONS } from "../lib/categoryIcons.ts";
import { Modal } from "./Modal.tsx";

export type LibrarySort = "lastWatched" | "added" | "title" | "rating" | "nextAir";
export type LibraryCategoryFilter = WatchCategory[];

export const DEFAULT_LIBRARY_SORT: LibrarySort = "lastWatched";
export const DEFAULT_LIBRARY_CATEGORY: LibraryCategoryFilter = [];

const SORTS: LibrarySort[] = ["lastWatched", "added", "title", "rating", "nextAir"];

/** E70: the FAB's active-filter dot — on whenever sort/category differ from the defaults. */
export function hasActiveFilter(sort: LibrarySort, category: LibraryCategoryFilter): boolean {
  return sort !== DEFAULT_LIBRARY_SORT || category.length > 0;
}

interface FilterPanelProps {
  sort: LibrarySort;
  category: LibraryCategoryFilter;
  onApply: (next: { sort: LibrarySort; category: LibraryCategoryFilter }) => void;
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
        <legend className="mb-2 font-mono text-xs text-yellow tracking-widest uppercase border-b border-white/5 pb-2 w-full">
          {t("library.filter.sortTitle")}
        </legend>
        {SORTS.map((s) => (
          <label key={s} className="flex items-center gap-3 text-sm text-snow cursor-pointer">
            <input
              type="radio"
              name="library-sort"
              checked={draftSort === s}
              onChange={() => setDraftSort(s)}
              className="accent-yellow h-4 w-4"
            />
            {t(`library.sort.${s}`)}
          </label>
        ))}
      </fieldset>
      <fieldset className="mt-6 flex flex-col gap-3">
        <legend className="mb-2 font-mono text-xs text-yellow tracking-widest uppercase border-b border-white/5 pb-2 w-full">
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  isSelected
                    ? "bg-yellow border-yellow text-[#080808]"
                    : "bg-[#101010] border-white/10 text-snow hover:bg-white/5 hover:border-white/20"
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

/** Filtrele: desktop top-right popover, mobile FAB opening the same form as a bottom sheet (E70). */
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
      {/* Desktop: top-right popover — unchanged. */}
      <div className="relative hidden sm:block">
        <button
          type="button"
          onClick={openPanel}
          className="font-mono text-[10px] tracking-widest uppercase border border-white/10 text-snow px-4 py-2 hover:bg-white/5 transition-colors flex items-center gap-2"
        >
          <span className="text-yellow">⚙</span> {t("library.filter.title")}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
            <div className="absolute right-0 z-20 mt-2 w-72 border border-white/10 bg-[#101010] p-6 shadow-2xl backdrop-blur-md">
              <FilterForm
                draftSort={draftSort}
                setDraftSort={setDraftSort}
                draftCategory={draftCategory}
                setDraftCategory={setDraftCategory}
              />
              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={reset}
                  className="font-mono text-[10px] tracking-widest uppercase border border-white/10 text-muted px-3 py-2 hover:text-snow hover:border-white/20 transition-colors"
                >
                  {t("library.filter.reset")}
                </button>
                <button
                  type="button"
                  onClick={apply}
                  className="font-mono text-[10px] tracking-widest uppercase bg-yellow text-[#080808] px-4 py-2 transition-opacity hover:opacity-90"
                >
                  {t("library.filter.apply")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile (E70): floating action button above the tab bar, opens a bottom sheet. */}
      <button
        type="button"
        onClick={openPanel}
        aria-label={t("library.filter.title")}
        style={{ viewTransitionName: "filter-fab" }}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-yellow text-[#080808] shadow-2xl sm:hidden"
      >
        <ListFilter size={32} strokeWidth={1.75} />
        {activeDot && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#080808]"
          />
        )}
      </button>

      {open && (
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          className="p-6"
          rootClassName="sm:hidden"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display italic text-snow text-xl">{t("library.filter.title")}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-mono text-[10px] tracking-widest uppercase text-muted hover:text-snow transition-colors"
            >
              {t("library.filter.close")}
            </button>
          </div>
          <FilterForm
            draftSort={draftSort}
            setDraftSort={setDraftSort}
            draftCategory={draftCategory}
            setDraftCategory={setDraftCategory}
          />
          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={reset}
              className="font-mono text-[10px] tracking-widest uppercase border border-white/10 text-muted px-3 py-2 hover:text-snow hover:border-white/20 transition-colors"
            >
              {t("library.filter.reset")}
            </button>
            <button
              type="button"
              onClick={apply}
              className="font-mono text-[10px] tracking-widest uppercase bg-yellow text-[#080808] px-4 py-2 transition-opacity hover:opacity-90"
            >
              {t("library.filter.apply")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
