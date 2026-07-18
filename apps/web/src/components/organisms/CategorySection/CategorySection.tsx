import { useTranslation } from "react-i18next";
import type { SeriesSummary, WatchCategory } from "../../../api/types.ts";
import { CATEGORY_ICONS } from "../../../lib/categoryIcons.ts";
import { SERIES_GRID_CLASSNAME } from "../../../lib/grid.ts";
import type { LibrarySort } from "../../../lib/librarySort.ts";
import { sortSeriesSummaries } from "../../../lib/sortSeries.ts";
import { sortsForCategory } from "../../../lib/uiPrefs.ts";
import { SectionHeader } from "../../molecules/SectionHeader/SectionHeader.tsx";
import { SeriesCard } from "../../molecules/SeriesCard/SeriesCard.tsx";
import { SortMenu } from "../../molecules/SortMenu/SortMenu.tsx";

interface CategorySectionProps {
  category: WatchCategory;
  items: SeriesSummary[];
  /** Spec 010 WP2: per-section sort (shared with Watch via watchSectionSorts). */
  sort: LibrarySort;
  /** When set, shows the in-header sort control (All Series only; browse uses Manage categories). */
  onSortChange?: (sort: LibrarySort) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/** One home-page section: category header (label + count + sort) + card grid.
 * Renders nothing when empty. */
export function CategorySection({
  category,
  items,
  sort,
  onSortChange,
  collapsed = false,
  onToggleCollapse,
}: CategorySectionProps) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  const Icon = CATEGORY_ICONS[category];
  const sorted = sortSeriesSummaries(items, sort);
  const sortOptions = sortsForCategory(category);

  return (
    <section className="flex flex-col">
      <SectionHeader
        icon={Icon}
        label={t(`category.${category}`)}
        count={sorted.length}
        inset="list"
        {...(onToggleCollapse ? { onClick: onToggleCollapse, expanded: !collapsed } : {})}
      >
        {onSortChange && sortOptions.length > 0 ? (
          <SortMenu sort={sort} onChange={onSortChange} options={sortOptions} idSuffix={category} />
        ) : null}
      </SectionHeader>
      <div data-expanded={!collapsed} className="section-collapse">
        <div>
          <div className={`${SERIES_GRID_CLASSNAME} list-inset pt-3`}>
            {sorted.map((series) => (
              <SeriesCard key={series.id} series={series} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
