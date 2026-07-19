import { ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { type LibrarySort, SORTS } from "../../../lib/librarySort.ts";
import { Modal } from "../Modal/Modal.tsx";

/**
 * Spec 010 WP2: reusable per-category sort popover (standalone Storybook surface).
 * Production sort uses AddSectionBar (`manage` on Browse, `sortOnly` on All Series).
 * Pass `options` from `sortsForCategory` so no-op keys never appear.
 */
export function SortMenu({
  sort,
  onChange,
  options = SORTS,
  idSuffix,
}: {
  sort: LibrarySort;
  onChange: (sort: LibrarySort) => void;
  /** Category-scoped sort keys; defaults to the full `SORTS` list. */
  options?: LibrarySort[];
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
          {options.map((s) => (
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

export type { LibrarySort } from "../../../lib/librarySort.ts";
export {
  DEFAULT_LIBRARY_CATEGORY,
  DEFAULT_LIBRARY_SORT,
  type LibraryCategoryFilter,
  SORTS,
} from "../../../lib/librarySort.ts";
