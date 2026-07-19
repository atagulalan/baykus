import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Stats } from "../../../../../api/types.ts";
import { formatDurationLabel, formatDurationParts } from "../../../../../lib/date.ts";
import { MiniBars } from "../MiniBars/MiniBars.tsx";
import { StatsSectionHeading } from "../StatsSectionHeading/StatsSectionHeading.tsx";

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

/** Horizontal scrollable year button strip (E112). Replaces the `<select>` YearSelect. */
function YearStrip({
  years,
  value,
  onChange,
}: {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {years.map((year) => (
        <button
          key={year}
          type="button"
          onClick={() => onChange(year)}
          className={`shrink-0 px-2 py-1 font-mono text-xs uppercase tracking-widest transition-colors ${
            year === value
              ? "text-yellow border-b-2 border-yellow font-bold"
              : "text-muted hover:text-snow border-b-2 border-transparent"
          }`}
        >
          {year}
        </button>
      ))}
    </div>
  );
}

/** spec.md §16 (E105) — independent year selector; monthly is calendar-year, weekly is ISO week-year. */
export function YearlyTimeSection({ stats }: YearlyTimeSectionProps) {
  const { t } = useTranslation();
  const years = stats.timeByYear.map((y) => y.year);
  const [selectedYear, setSelectedYear] = useState(years[0]);
  if (years.length === 0 || selectedYear === undefined) return null;

  const yearData = stats.timeByYear.find((y) => y.year === selectedYear);
  if (!yearData) return null;

  const totalText = formatDurationLabel(formatDurationParts(yearData.totalMin), t);

  return (
    <section className="content-inset flex flex-col gap-4">
      <StatsSectionHeading>{t("stats.yearlyTime.title")}</StatsSectionHeading>
      <YearStrip years={years} value={selectedYear} onChange={setSelectedYear} />
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
