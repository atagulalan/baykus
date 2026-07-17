import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Stats } from "../../api/types.ts";
import { formatDurationParts } from "../../lib/date.ts";
import { MiniBars } from "./MiniBars.tsx";
import { YearStrip } from "./YearStrip.tsx";

interface YearlyTimeSectionProps {
  stats: Pick<Stats, "timeByYear">;
}

function monthInitial(monthIndex: number): string {
  return new Intl.DateTimeFormat("tr-TR", { month: "narrow" }).format(
    new Date(Date.UTC(2000, monthIndex, 1)),
  );
}

const MAX_ISO_WEEKS = 53;

/**
 * The payload lists only non-zero ISO weeks (sparse). Rendering that array
 * directly would space bars by array position, not calendar time — a run of
 * inactive weeks between two active ones would silently collapse to nothing,
 * misrepresenting the timeline. Reconstruct the full dense week range instead.
 */
function denseWeeklyMin(
  weeklyMin: { week: number; min: number }[],
): { week: number; min: number }[] {
  const byWeek = new Map(weeklyMin.map((w) => [w.week, w.min]));
  return Array.from({ length: MAX_ISO_WEEKS }, (_, i) => {
    const week = i + 1;
    return { week, min: byWeek.get(week) ?? 0 };
  });
}

/** spec.md §16 (E105) — independent year selector; monthly is calendar-year, weekly is ISO week-year. */
export function YearlyTimeSection({ stats }: YearlyTimeSectionProps) {
  const { t } = useTranslation();
  const years = stats.timeByYear.map((y) => y.year);
  const [selectedYear, setSelectedYear] = useState(years[0]);
  if (years.length === 0 || selectedYear === undefined) return null;

  const yearData = stats.timeByYear.find((y) => y.year === selectedYear);
  if (!yearData) return null;

  const parts = formatDurationParts(yearData.totalMin);
  const totalText =
    parts.mode === "monthsDaysHours"
      ? t("stats.duration.monthsDaysHours", {
          months: parts.months,
          days: parts.days,
          hours: parts.hours,
        })
      : parts.mode === "daysHours"
        ? t("stats.duration.daysHours", { days: parts.days, hours: parts.hours })
        : t("stats.duration.hoursMinutes", { hours: parts.hours, minutes: parts.minutes });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display italic text-snow text-2xl tracking-tight">
          {t("stats.yearlyTime.title")}
        </h2>
        <YearStrip years={years} value={selectedYear} onChange={setSelectedYear} />
      </div>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            {t("stats.yearlyTime.monthly", { total: totalText })}
          </p>
          <MiniBars
            items={yearData.monthlyMin.map((min, i) => ({
              key: String(i),
              label: monthInitial(i),
              value: min,
              tooltip: `${monthInitial(i)}: ${min} dk`,
            }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            {t("stats.yearlyTime.weekly", { total: totalText })}
          </p>
          <MiniBars
            labelEvery={5}
            items={denseWeeklyMin(yearData.weeklyMin).map((w) => ({
              key: String(w.week),
              label: String(w.week),
              value: w.min,
              tooltip: t("stats.yearlyTime.weekTooltip", { week: w.week, minutes: w.min }),
            }))}
          />
        </div>
      </div>
    </section>
  );
}
