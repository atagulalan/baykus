import { useTranslation } from "react-i18next";
import type { Stats } from "../../api/types.ts";
import { formatDurationParts } from "../../lib/date.ts";
import { StatTile } from "./StatTile.tsx";

interface HeroSectionProps {
  stats: Stats;
}

/** spec.md §1-2: hero total + the 6-up tile grid. */
export function HeroSection({ stats }: HeroSectionProps) {
  const { t } = useTranslation();
  const parts = formatDurationParts(stats.watchTimeMin);
  const durationText =
    parts.mode === "daysHours"
      ? t("stats.duration.daysHours", { days: parts.days, hours: parts.hours })
      : t("stats.duration.hoursMinutes", { hours: parts.hours, minutes: parts.minutes });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <p className="font-display italic text-snow text-6xl leading-none tracking-tight sm:text-7xl">
          {durationText}
        </p>
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {t("stats.hero.subline", {
            episodes: stats.episodesWatched.toLocaleString("tr-TR"),
            series: stats.seriesCount.toLocaleString("tr-TR"),
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label={t("stats.tiles.tracked")}
          value={stats.seriesCount.toLocaleString("tr-TR")}
        />
        <StatTile
          label={t("stats.tiles.episodes")}
          value={stats.episodesWatched.toLocaleString("tr-TR")}
        />
        <StatTile
          label={t("stats.tiles.favorites")}
          value={stats.favoritesCount.toLocaleString("tr-TR")}
        />
        <StatTile
          label={t("stats.tiles.watching")}
          value={stats.itemCount.watching.toLocaleString("tr-TR")}
        />
        <StatTile
          label={t("stats.tiles.finished")}
          value={stats.itemCount.finished.toLocaleString("tr-TR")}
        />
        <StatTile
          label={t("stats.tiles.watchLater")}
          value={stats.itemCount.watch_later.toLocaleString("tr-TR")}
        />
      </div>

      {stats.episodesWatched === 0 && (
        <p className="text-center font-mono text-sm text-muted">{t("stats.empty")}</p>
      )}
    </div>
  );
}
