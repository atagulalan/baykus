import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Stats } from "../../api/types.ts";
import { Heatmap } from "./Heatmap.tsx";
import { YearSelect } from "./YearSelect.tsx";

interface ActivityHeatmapSectionProps {
  stats: Pick<Stats, "activityByDay" | "timeByYear">;
}

/** spec.md §17 (E106) — independent year selector from Yearly Time's; non-zero days only in the payload. */
export function ActivityHeatmapSection({ stats }: ActivityHeatmapSectionProps) {
  const { t } = useTranslation();
  const years = stats.timeByYear.map((y) => y.year);
  const [selectedYear, setSelectedYear] = useState(years[0]);
  if (years.length === 0 || selectedYear === undefined) return null;

  const yearStart = `${selectedYear}-01-01`;
  const yearEnd = `${selectedYear}-12-31`;
  const daysInYear = stats.activityByDay.filter((d) => d.date >= yearStart && d.date <= yearEnd);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display italic text-snow text-2xl tracking-tight">
          {t("stats.activityHeatmap.title")}
        </h2>
        <YearSelect years={years} value={selectedYear} onChange={setSelectedYear} />
      </div>
      <Heatmap
        year={selectedYear}
        days={daysInYear}
        tooltipFor={(date, count) => t("stats.activityHeatmap.tooltip", { date, count })}
      />
      <div className="flex items-center justify-end gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
        <span>{t("stats.activityHeatmap.legendLow")}</span>
        <span aria-hidden className="h-[11px] w-[11px] bg-white/5" />
        <span aria-hidden className="h-[11px] w-[11px] bg-yellow/25" />
        <span aria-hidden className="h-[11px] w-[11px] bg-yellow/55" />
        <span aria-hidden className="h-[11px] w-[11px] bg-yellow/90" />
        <span>{t("stats.activityHeatmap.legendHigh")}</span>
      </div>
    </section>
  );
}
