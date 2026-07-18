import { ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { WatchCategory } from "../api/types.ts";
import { Modal } from "./Modal.tsx";

export type LibrarySort = "lastWatched" | "added" | "title" | "rating" | "nextAir";
/** Kept for `UiPrefsDto.libraryBrowse.category` wire compatibility (api/types.ts, not owned by
 * WP2) — spec 010 WP2 dropped the category-filter UI, so nothing writes a non-empty value
 * anymore, but old/foreign prefs payloads may still carry one and must round-trip cleanly. */
export type LibraryCategoryFilter = WatchCategory[];

export const DEFAULT_LIBRARY_SORT: LibrarySort = "lastWatched";
export const DEFAULT_LIBRARY_CATEGORY: LibraryCategoryFilter = [];

export const SORTS: LibrarySort[] = ["lastWatched", "added", "title", "rating", "nextAir"];

/**
 * Spec 010 WP2: the reusable in-header sort control. Used per-category on Watch
 * (`CategoryListSection`) and grid sections (`CategorySection`) alike, replacing the old
 * floating filter FAB. Self-contained `relative` wrapper — drop it anywhere, no anchor
 * markup required.
 */
export function SortMenu({
  sort,
  onChange,
  idSuffix,
}: {
  sort: LibrarySort;
  onChange: (sort: LibrarySort) => void;
  /** Uniquifies the radio group's `name` when multiple menus render at once (per category). */
  idSuffix: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("library.filter.sortTitle")}
        className="flex h-5 w-5 items-center justify-center text-muted transition-colors hover:text-snow"
      >
        <ArrowUpDown size={14} strokeWidth={1.75} />
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        desktop="popover"
        popoverClassName="w-56 p-3"
        title={t("library.filter.sortTitle")}
        className="p-4"
      >
        <fieldset className="flex flex-col gap-2">
          {SORTS.map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-3 text-sm text-snow">
              <input
                type="radio"
                name={`sort-${idSuffix}`}
                checked={sort === s}
                onChange={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className="h-4 w-4 accent-yellow"
              />
              {t(`library.sort.${s}`)}
            </label>
          ))}
        </fieldset>
      </Modal>
    </span>
  );
}
