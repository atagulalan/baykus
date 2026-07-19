import { useTranslation } from "react-i18next";
import type { Stats } from "../../../../../api/types.ts";
import { formatDurationLabel, formatDurationParts } from "../../../../../lib/date.ts";
import { MiniBars } from "../MiniBars/MiniBars.tsx";
import { StatsSectionHeading } from "../StatsSectionHeading/StatsSectionHeading.tsx";
import { StatTile } from "../StatTile/StatTile.tsx";

interface UpcomingSectionProps {
  stats: Pick<Stats, "upcoming">;
}

function monthShortLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(
    new Date(Date.UTC(year as number, (m as number) - 1, 1)),
  );
}

/** spec.md §12 (E101) — active-trio unwatched episodes, current+next month always present. */
export function UpcomingSection({ stats }: UpcomingSectionProps) {
  const { t } = useTranslation();
  const { months } = stats.upcoming;
  const current = months[0];
  const next = months[1];
  if (!current || !next) return null;

  const tileValue = (month: { episodes: number; watchTimeMin: number }) => {
    const parts = formatDurationParts(month.watchTimeMin);
    const sub = formatDurationLabel(parts, t);
    return { value: month.episodes.toLocaleString("tr-TR"), sub };
  };

  return (
    <section className="content-inset flex flex-col gap-4">
      <StatsSectionHeading>{t("stats.upcoming.title")}</StatsSectionHeading>
      <div className="grid grid-cols-2 gap-4">
        <StatTile label={t("stats.recent.thisMonth")} {...tileValue(current)} />
        <StatTile label={t("stats.upcoming.nextMonth")} {...tileValue(next)} />
      </div>
      <MiniBars
        items={months.map((m) => ({
          key: m.month,
          label: monthShortLabel(m.month),
          value: m.episodes,
          tooltip: `${monthShortLabel(m.month)}: ${m.episodes}`,
        }))}
      />
      <p className="text-center font-mono text-xs text-muted-dim">{t("stats.upcoming.caveat")}</p>
    </section>
  );
}
