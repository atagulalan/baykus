import { X } from "lucide-react";
import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import type { SeriesSummary, WatchCategory } from "../api/types.ts";
import { CATEGORY_ICONS } from "../lib/categoryIcons.ts";
import { sortSeriesSummaries } from "../lib/sortSeries.ts";
import type { LibrarySort } from "./FilterPanel.tsx";
import { SortMenu } from "./FilterPanel.tsx";
import { WatchNextRow } from "./WatchNextRow.tsx";

interface CategoryListSectionProps {
  category: WatchCategory;
  items: SeriesSummary[];
  sort: LibrarySort;
  onSortChange: (sort: LibrarySort) => void;
  /** When false, hide the section remove control (E141: `watching` is pinned). */
  removable?: boolean;
  onRemove: () => void;
  headingRef?: Ref<HTMLHeadingElement> | undefined;
  isMarking: (itemId: number) => boolean;
  onQuickMark: (episodeId: number, itemId: number) => void;
}

/** E141: sticky category header with per-section sort + WatchNextRow list. */
export function CategoryListSection({
  category,
  items,
  sort,
  onSortChange,
  removable = true,
  onRemove,
  headingRef,
  isMarking,
  onQuickMark,
}: CategoryListSectionProps) {
  const { t } = useTranslation();
  const rows = sortSeriesSummaries(
    items.filter((s) => s.nextUnwatched != null),
    sort,
  );

  const Icon = CATEGORY_ICONS[category];
  const label = t(`category.${category}`);

  return (
    <section className="flex flex-col gap-1">
      <h2
        ref={headingRef}
        style={{
          top: "var(--app-header-height, 3.5rem)",
          scrollMarginTop: "var(--app-header-height, 3.5rem)",
        }}
        className="sticky z-30 -mx-3 border-b border-white/5 bg-void/95 backdrop-blur sm:-mx-6"
      >
        <div className="flex min-h-11 items-center gap-2 px-5 py-2.5 sm:px-12">
          {Icon ? <Icon size={16} strokeWidth={1.75} className="shrink-0 text-muted" /> : null}
          <span className="min-w-0 truncate font-semibold text-base text-snow">{label}</span>
          <span className="font-mono text-sm tabular-nums text-muted">({rows.length})</span>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <SortMenu sort={sort} onChange={onSortChange} idSuffix={category} />
            {removable ? (
              <button
                type="button"
                onClick={onRemove}
                aria-label={t("watch.removeSection")}
                className="flex h-5 w-5 items-center justify-center text-muted transition-colors hover:text-snow"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            ) : null}
          </div>
        </div>
      </h2>

      {rows.length === 0 ? (
        <p className="px-5 py-3 text-sm text-muted sm:px-12">{t("watch.empty.section")}</p>
      ) : (
        <div className="flex flex-col">
          {rows.map((series) => (
            <WatchNextRow
              key={series.id}
              series={series}
              marking={isMarking(series.id)}
              onQuickMark={(episodeId) => onQuickMark(episodeId, series.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
