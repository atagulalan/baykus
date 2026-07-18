import { useTranslation } from "react-i18next";
import type { Stats } from "../../../../../api/types.ts";
import { Heatmap } from "./Heatmap.tsx";

interface ActivityHeatmapSectionProps {
  stats: Pick<Stats, "activityByDay" | "timeByYear">;
}

/** spec.md §17 (E106) — continuous heatmap showing all years end-to-end; non-zero days only in the payload. */
export function ActivityHeatmapSection({ stats }: ActivityHeatmapSectionProps) {
  const { t } = useTranslation();

  // Sort years ascending so they display chronologically left-to-right (oldest -> newest)
  const years = [...stats.timeByYear.map((y) => y.year)].sort((a, b) => a - b);

  if (years.length === 0) return null;

  return (
    <section className="content-inset flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display italic text-snow text-2xl tracking-tight">
          {t("stats.activityHeatmap.title")}
        </h2>
      </div>
      {stats.activityByDay.length === 0 ? (
        <div className="flex h-32 items-center justify-center border border-white/5 bg-white/5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {t("stats.empty", { defaultValue: "No activity" })}
          </p>
        </div>
      ) : (
        <Heatmap
          years={years}
          days={stats.activityByDay}
          tooltipFor={(date, count) => t("stats.activityHeatmap.tooltip", { date, count })}
        />
      )}
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
