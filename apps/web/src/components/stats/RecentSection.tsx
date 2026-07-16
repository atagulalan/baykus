import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { Stats } from "../../api/types.ts";
import { formatDurationParts } from "../../lib/date.ts";
import { StatTile } from "./StatTile.tsx";

interface RecentSectionProps {
  stats: Pick<Stats, "recent">;
}

function windowValue(
  window: { episodes: number; watchTimeMin: number },
  t: TFunction,
): { value: string; sub: string } {
  const parts = formatDurationParts(window.watchTimeMin);
  const value =
    parts.mode === "daysHours"
      ? t("stats.duration.daysHours", { days: parts.days, hours: parts.hours })
      : t("stats.duration.hoursMinutes", { hours: parts.hours, minutes: parts.minutes });
  return { value, sub: t("stats.recent.episodesSub", { count: window.episodes }) };
}

/** spec.md §3 — rolling 7/30-day windows + this calendar month, dated watches only (E96). */
export function RecentSection({ stats }: RecentSectionProps) {
  const { t } = useTranslation();
  const { last7Days, last30Days, thisMonth } = stats.recent;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display italic text-snow text-2xl tracking-tight">
        {t("stats.recent.title")}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label={t("stats.recent.last7Days")} {...windowValue(last7Days, t)} />
        <StatTile label={t("stats.recent.last30Days")} {...windowValue(last30Days, t)} />
        <StatTile label={t("stats.recent.thisMonth")} {...windowValue(thisMonth, t)} />
      </div>
    </section>
  );
}
