import { useTranslation } from "react-i18next";
import type { SeriesSummary, WatchCategory } from "../api/types.ts";
import { CATEGORY_ICONS } from "../lib/categoryIcons.ts";
import { SERIES_GRID_CLASSNAME } from "../lib/grid.ts";
import { SeriesCard } from "./SeriesCard.tsx";

interface CategorySectionProps {
  category: WatchCategory;
  items: SeriesSummary[];
}

/** One home-page section: category header (label + count) + card grid. Renders nothing when empty. */
export function CategorySection({ category, items }: CategorySectionProps) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  const Icon = CATEGORY_ICONS[category];

  return (
    <section className="flex flex-col gap-3">
      <h2
        style={{
          top: "var(--app-header-height, 3.5rem)",
          scrollMarginTop: "var(--app-header-height, 3.5rem)",
        }}
        className="sticky z-30 -mx-3 flex items-center gap-2 border-b border-white/5 bg-void/95 px-3 py-2.5 backdrop-blur sm:-mx-6 sm:px-6"
      >
        {Icon ? <Icon size={16} strokeWidth={1.75} className="shrink-0 text-muted" /> : null}
        <span className="font-semibold text-base text-snow">{t(`category.${category}`)}</span>
        <span className="font-mono text-sm tabular-nums text-muted">({items.length})</span>
      </h2>
      <div className={SERIES_GRID_CLASSNAME}>
        {items.map((series) => (
          <SeriesCard key={series.id} series={series} />
        ))}
      </div>
    </section>
  );
}
