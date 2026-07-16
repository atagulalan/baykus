import { useTranslation } from "react-i18next";
import type { Stats } from "../../api/types.ts";
import { formatDurationParts } from "../../lib/date.ts";
import { HBarList } from "./HBarList.tsx";
import { StatTile } from "./StatTile.tsx";

interface BacklogSectionProps {
  stats: Pick<Stats, "backlog">;
}

/** spec.md §10 (E99) — aired, unwatched, non-special episodes over the active trio. */
export function BacklogSection({ stats }: BacklogSectionProps) {
  const { t } = useTranslation();
  const { episodes, seriesCount, watchTimeMin, topSeries } = stats.backlog;
  if (episodes === 0) return null;

  const parts = formatDurationParts(watchTimeMin);
  const timeValue =
    parts.mode === "daysHours"
      ? t("stats.duration.daysHours", { days: parts.days, hours: parts.hours })
      : t("stats.duration.hoursMinutes", { hours: parts.hours, minutes: parts.minutes });

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display italic text-snow text-2xl tracking-tight">
        {t("stats.backlog.title")}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <StatTile
          label={t("stats.backlog.episodes")}
          value={episodes.toLocaleString("tr-TR")}
          sub={t("stats.backlog.seriesSub", { count: seriesCount })}
        />
        <StatTile label={t("stats.backlog.remainingTime")} value={timeValue} />
      </div>
      <HBarList
        items={topSeries.map((s) => ({
          key: String(s.itemId),
          label: s.title,
          value: s.episodes,
          displayValue: t("stats.backlog.episodesShort", { count: s.episodes }),
        }))}
      />
    </section>
  );
}
