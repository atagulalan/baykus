import { useTranslation } from "react-i18next";
import type { SeriesSummary, WatchCategory } from "../../../api/types.ts";
import { CATEGORY_ICONS } from "../../../lib/categoryIcons.ts";
import { SERIES_GRID_CLASSNAME } from "../../../lib/grid.ts";
import type { LibrarySort } from "../../../lib/librarySort.ts";
import { sortSeriesSummaries } from "../../../lib/sortSeries.ts";
import { SectionHeader } from "../../molecules/SectionHeader/SectionHeader.tsx";
import { SeriesCard } from "../../molecules/SeriesCard/SeriesCard.tsx";

interface CategorySectionProps {
  category: WatchCategory;
  items: SeriesSummary[];
  /** Per-section sort (shared with Watch via watchSectionSorts). */
  sort: LibrarySort;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/** One home-page section: category header (label + count) + card grid. Renders nothing when empty. */
export function CategorySection({
  category,
  items,
  sort,
  collapsed = false,
  onToggleCollapse,
}: CategorySectionProps) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  const Icon = CATEGORY_ICONS[category];
  const sorted = sortSeriesSummaries(items, sort);

  return (
    <section className="flex flex-col">
      <SectionHeader
        icon={Icon}
        label={t(`category.${category}`)}
        count={sorted.length}
        inset="list"
        {...(onToggleCollapse ? { onClick: onToggleCollapse, expanded: !collapsed } : {})}
      />
      <div data-expanded={!collapsed} className="section-collapse">
        <div>
          <div className={SERIES_GRID_CLASSNAME}>
            {sorted.map((series) => (
              <SeriesCard key={series.id} series={series} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
