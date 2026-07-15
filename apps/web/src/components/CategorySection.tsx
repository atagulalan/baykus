import { useTranslation } from "react-i18next";
import type { SeriesSummary, WatchCategory } from "../api/types.ts";
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
        {t(`category.${category}`)} ({items.length})
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((series) => (
          <SeriesCard key={series.id} series={series} />
        ))}
      </div>
    </section>
  );
}
