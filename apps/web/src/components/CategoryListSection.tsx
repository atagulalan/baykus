import { X } from 'lucide-react'
import type { Ref } from 'react'
import { useTranslation } from 'react-i18next'
import type { SeriesSummary, WatchCategory } from '../api/types.ts'
import { CATEGORY_ICONS } from '../lib/categoryIcons.ts'
import { sortSeriesSummaries } from '../lib/sortSeries.ts'
import { sortsForCategory } from '../lib/uiPrefs.ts'
import type { LibrarySort } from './FilterPanel.tsx'
import { SortMenu } from './FilterPanel.tsx'
import { SectionHeader } from './SectionHeader.tsx'
import { WatchNextRow } from './WatchNextRow.tsx'

interface CategoryListSectionProps {
  category: WatchCategory
  items: SeriesSummary[]
  sort: LibrarySort
  onSortChange: (sort: LibrarySort) => void
  /** When false, hide the section remove control (E141: `watching` + `needs_review` are pinned). */
  removable?: boolean
  onRemove: () => void
  headingRef?: Ref<HTMLHeadingElement> | undefined
  isMarking: (itemId: number) => boolean
  onQuickMark: (episodeId: number, itemId: number) => void
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
  onQuickMark
}: CategoryListSectionProps) {
  const { t } = useTranslation()
  const rows = sortSeriesSummaries(
    items.filter((s) => s.nextUnwatched != null),
    sort
  )

  // E156: needs_review is auto-shown only when it has visible rows — never an empty shell.
  if (category === 'needs_review' && rows.length === 0) return null

  const Icon = CATEGORY_ICONS[category]
  const label = t(`category.${category}`)
  const sortOptions = sortsForCategory(category)

  return (
    <section className="flex flex-col gap-1">
      <SectionHeader
        icon={Icon}
        label={label}
        count={rows.length}
        headingRef={headingRef}
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
        {removable ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('watch.removeSection')}
            className="flex h-5 w-5 items-center justify-center text-muted transition-colors hover:text-snow"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        ) : null}
      </SectionHeader>

      {rows.length === 0 ? (
        <p className="px-2 py-3 text-sm text-muted sm:px-4">
          {t('watch.empty.section')}
        </p>
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
  )
}
