import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import type { SeriesSummary, WatchCategory } from "../../../api/types.ts";
import { CATEGORY_ICONS } from "../../../lib/categoryIcons.ts";
import type { LibrarySort } from "../../../lib/librarySort.ts";
import { sortSeriesSummaries } from "../../../lib/sortSeries.ts";
import { SectionHeader } from "../../molecules/SectionHeader/SectionHeader.tsx";
import { WatchNextRow } from "../../molecules/WatchNextRow/WatchNextRow.tsx";

interface CategoryListSectionProps {
  category: WatchCategory;
  items: SeriesSummary[];
  sort: LibrarySort;
  headingRef?: Ref<HTMLHeadingElement> | undefined;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isMarking: (itemId: number) => boolean;
  onQuickMark: (episodeId: number, itemId: number) => void;
}

/** E141: sticky category header with per-section sort + WatchNextRow list. */
export function CategoryListSection({
  category,
  items,
  sort,
  headingRef,
  collapsed = false,
  onToggleCollapse,
  isMarking,
  onQuickMark,
}: CategoryListSectionProps) {
  const { t } = useTranslation();
  const rows = sortSeriesSummaries(
    items.filter((s) => s.nextUnwatched != null),
    sort,
  );

  // E156: needs_review is auto-shown only when it has visible rows — never an empty shell.
  if (category === "needs_review" && rows.length === 0) return null;

  const Icon = CATEGORY_ICONS[category];
  const label = t(`category.${category}`);

  return (
    <section className="flex flex-col">
      <SectionHeader
        icon={Icon}
        label={label}
        count={rows.length}
        headingRef={headingRef}
        inset="list"
        {...(onToggleCollapse ? { onClick: onToggleCollapse, expanded: !collapsed } : {})}
      />

      <div data-expanded={!collapsed} className="section-collapse">
        <div>
          {rows.length === 0 ? (
            <p className="list-inset pt-1 pb-3 text-sm text-muted">{t("watch.empty.section")}</p>
          ) : (
            <div className="flex flex-col pt-1">
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
        </div>
      </div>
    </section>
  );
}
