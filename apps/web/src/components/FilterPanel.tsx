import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CATEGORY_ORDER, type WatchCategory } from "../api/types.ts";

export type LibrarySort = "lastWatched" | "added" | "title" | "rating" | "nextAir";
export type LibraryCategoryFilter = WatchCategory | "all";

export const DEFAULT_LIBRARY_SORT: LibrarySort = "lastWatched";
export const DEFAULT_LIBRARY_CATEGORY: LibraryCategoryFilter = "all";
const RESET_SORT: LibrarySort = "added";

const SORTS: LibrarySort[] = ["lastWatched", "added", "title", "rating", "nextAir"];

interface FilterPanelProps {
  sort: LibrarySort;
  category: LibraryCategoryFilter;
  onApply: (next: { sort: LibrarySort; category: LibraryCategoryFilter }) => void;
}

/** Filtrele popover: sort + progress (category) radios, APPLY/RESET semantics — draft state only. */
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
    setDraftSort(RESET_SORT);
    setDraftCategory("all");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openPanel}
        className="rounded bg-zinc-800 px-3 py-1 text-sm text-zinc-300"
      >
        ⚙ {t("library.filter.title")}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 font-medium text-sm text-zinc-300">
                {t("library.filter.sortTitle")}
              </legend>
              {SORTS.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="radio"
                    name="library-sort"
                    checked={draftSort === s}
                    onChange={() => setDraftSort(s)}
                  />
                  {t(`library.sort.${s}`)}
                </label>
              ))}
            </fieldset>
            <fieldset className="mt-4 flex flex-col gap-1.5">
              <legend className="mb-1 font-medium text-sm text-zinc-300">
                {t("library.filter.progressTitle")}
              </legend>
              <label className="flex items-center gap-2 text-sm text-zinc-200">
                <input
                  type="radio"
                  name="library-category"
                  checked={draftCategory === "all"}
                  onChange={() => setDraftCategory("all")}
                />
                {t("library.filter.allCategories")}
              </label>
              {CATEGORY_ORDER.map((c: WatchCategory) => (
                <label key={c} className="flex items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="radio"
                    name="library-category"
                    checked={draftCategory === c}
                    onChange={() => setDraftCategory(c)}
                  />
                  {t(`category.${c}`)}
                </label>
              ))}
            </fieldset>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={reset}
                className="rounded bg-zinc-800 px-3 py-1 text-sm text-zinc-300"
              >
                {t("library.filter.reset")}
              </button>
              <button
                type="button"
                onClick={apply}
                className="rounded bg-emerald-600 px-3 py-1 font-medium text-sm text-white"
              >
                {t("library.filter.apply")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
