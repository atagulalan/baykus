import { useTranslation } from "react-i18next";
import type { Stats } from "../../api/types.ts";
import { CATEGORY_CHART_COLORS, CHART_CATEGORY_ORDER } from "../../lib/categoryColors.ts";
import { StackedBar } from "./StackedBar.tsx";

interface CategoryStatusSectionProps {
  stats: Pick<Stats, "itemCount">;
}

/** spec.md §5 (E97) — app WatchCategory buckets minus needs_review (import noise). */
export function CategoryStatusSection({ stats }: CategoryStatusSectionProps) {
  const { t } = useTranslation();
  if (CHART_CATEGORY_ORDER.every((c) => stats.itemCount[c] === 0)) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display italic text-snow text-2xl tracking-tight">
        {t("stats.categoryStatus.title")}
      </h2>
      <StackedBar
        segments={CHART_CATEGORY_ORDER.map((category) => ({
          key: category,
          label: t(`category.${category}`),
          value: stats.itemCount[category],
          colorClass: CATEGORY_CHART_COLORS[category],
        }))}
      />
    </section>
  );
}
