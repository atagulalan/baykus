import { useTranslation } from "react-i18next";
import type { Stats } from "../../api/types.ts";
import { formatDurationParts } from "../../lib/date.ts";
import { HBarList } from "./HBarList.tsx";

interface MostWatchedSectionProps {
  stats: Pick<Stats, "mostWatchedByTime">;
}

/** spec.md §4 (E110) — top 12 items by summed watch time, rewatches included. */
export function MostWatchedSection({ stats }: MostWatchedSectionProps) {
  const { t } = useTranslation();
  if (stats.mostWatchedByTime.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display italic text-snow text-2xl tracking-tight">
        {t("stats.mostWatchedByTime.title")}
      </h2>
      <HBarList
        items={stats.mostWatchedByTime.map((item) => {
          const parts = formatDurationParts(item.watchTimeMin);
          const displayValue =
            parts.mode === "monthsDaysHours"
              ? t("stats.duration.monthsDaysHours", {
                  months: parts.months,
                  days: parts.days,
                  hours: parts.hours,
                })
              : parts.mode === "daysHours"
                ? t("stats.duration.daysHours", { days: parts.days, hours: parts.hours })
                : t("stats.duration.hoursMinutes", { hours: parts.hours, minutes: parts.minutes });
          return {
            key: String(item.itemId),
            label: item.title,
            value: item.watchTimeMin,
            displayValue,
          };
        })}
      />
    </section>
  );
}
