import { useTranslation } from "react-i18next";
import type { SeriesSummary, WatchCategory } from "../api/types.ts";
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

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-lg">
        {t(`category.${category}`)}{" "}
        <span className="font-mono tabular-nums text-muted">({items.length})</span>
      </h2>
      <div className={SERIES_GRID_CLASSNAME}>
        {items.map((series) => (
          <SeriesCard key={series.id} series={series} />
        ))}
      </div>
    </section>
  );
}
