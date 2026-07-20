import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import type { SeriesSummary, WatchCategory } from "../../../api/types.ts";
import { CATEGORY_ICONS } from "../../../lib/categoryIcons.ts";
import type { LibrarySort } from "../../../lib/librarySort.ts";
import { sortSeriesSummaries } from "../../../lib/sortSeries.ts";
import { AccordionPanel } from "../../atoms/Accordion/Accordion.tsx";
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

/** E141 / E186: sticky category header with per-section sort + WatchNextRow list. */
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
  // E186: show every series in the section (same membership as grid CategorySection).
  const rows = sortSeriesSummaries(items, sort);

  // Hide empty sections (needs_review also stays hidden when empty — E156).
  if (rows.length === 0) return null;

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

      <AccordionPanel
        open={!collapsed}
        unmountOnExit={false}
        overflowVisibleWhenOpen
        contentClassName="flex flex-col gap-0 pt-2"
      >
        {rows.map((series) => (
          <WatchNextRow
            key={series.id}
            series={series}
            marking={isMarking(series.id)}
            onQuickMark={(episodeId) => onQuickMark(episodeId, series.id)}
          />
        ))}
      </AccordionPanel>
    </section>
  );
}
