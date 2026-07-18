import { useTranslation } from "react-i18next";
import type { Stats } from "../../../../../api/types.ts";
import { CATEGORY_CHART_COLORS, CHART_CATEGORY_ORDER } from "../../../../../lib/categoryColors.ts";

interface CategoryStatusSectionProps {
  stats: Pick<Stats, "itemCount">;
}

interface StackedBarSegment {
  key: string;
  label: string;
  value: number;
  colorClass: string;
}

/** ui.md primitive: flex segments (zero-count skipped) + a legend that keeps every segment. */
function StackedBar({ segments }: { segments: StackedBarSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 gap-[2px] overflow-hidden">
        {visible.map((s) => (
          <div
            key={s.key}
            aria-hidden
            title={`${s.label}: ${s.value}`}
            className={s.colorClass}
            style={{ width: `${total > 0 ? (s.value / total) * 100 : 0}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <span
            key={s.key}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted"
          >
            <span aria-hidden className={`h-2 w-2 shrink-0 ${s.colorClass}`} />
            {s.label} ({s.value})
          </span>
        ))}
      </div>
    </div>
  );
}

/** spec.md §5 (E97) — app WatchCategory buckets minus needs_review (import noise). */
export function CategoryStatusSection({ stats }: CategoryStatusSectionProps) {
  const { t } = useTranslation();
  if (CHART_CATEGORY_ORDER.every((c) => stats.itemCount[c] === 0)) return null;

  return (
    <section className="content-inset flex flex-col gap-4">
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
