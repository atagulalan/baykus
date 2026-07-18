import { useTranslation } from 'react-i18next'
import type { SeriesSummary, WatchCategory } from '../api/types.ts'
import { CATEGORY_ICONS } from '../lib/categoryIcons.ts'
import { SERIES_GRID_CLASSNAME } from '../lib/grid.ts'
import { sortSeriesSummaries } from '../lib/sortSeries.ts'
import { sortsForCategory } from '../lib/uiPrefs.ts'
import type { LibrarySort } from './FilterPanel.tsx'
import { SortMenu } from './FilterPanel.tsx'
import { SectionHeader } from './SectionHeader.tsx'
import { SeriesCard } from './SeriesCard.tsx'

interface CategorySectionProps {
  category: WatchCategory
  items: SeriesSummary[]
  /** Spec 010 WP2: per-section sort (shared with Watch via watchSectionSorts). */
  sort: LibrarySort
  onSortChange: (sort: LibrarySort) => void
}

/** One home-page section: category header (label + count + sort) + card grid.
 * Renders nothing when empty. */
export function CategorySection({
  category,
  items,
  sort,
  onSortChange
}: CategorySectionProps) {
  const { t } = useTranslation()
  if (items.length === 0) return null

  const Icon = CATEGORY_ICONS[category]
  const sorted = sortSeriesSummaries(items, sort)
  const sortOptions = sortsForCategory(category)

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        icon={Icon}
        label={t(`category.${category}`)}
        count={sorted.length}
        inset="list"
      >
        {sortOptions.length > 0 ? (
          <SortMenu
            sort={sort}
            onChange={onSortChange}
            options={sortOptions}
            idSuffix={category}
          />
        ) : null}
      </SectionHeader>
      <div className={`${SERIES_GRID_CLASSNAME} content-inset`}>
        {sorted.map((series) => (
          <SeriesCard key={series.id} series={series} />
        ))}
      </div>
    </section>
  )
}
