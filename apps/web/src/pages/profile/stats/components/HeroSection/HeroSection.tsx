import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Stats } from "../../../../../api/types.ts";
import { formatDurationLabel, formatDurationParts } from "../../../../../lib/date.ts";
import { StatTile } from "../StatTile/StatTile.tsx";

interface HeroSectionProps {
  stats: Stats;
}

const FUN_ACTIVITIES = [
  { id: "walkAroundWorld", minutes: 480000 },
  { id: "shower", minutes: 15 },
  { id: "outerWilds", minutes: 22 },
  { id: "lotr", minutes: 683 },
  { id: "moonFlight", minutes: 4320 },
  { id: "mountEverest", minutes: 57600 },
] as const;

/** spec.md §1-2: hero total + the 6-up tile grid. */
export function HeroSection({ stats }: HeroSectionProps) {
  const { t, i18n } = useTranslation();
  const [activityIndex, setActivityIndex] = useState(() =>
    Math.floor(Math.random() * FUN_ACTIVITIES.length),
  );

  const currentActivity = FUN_ACTIVITIES[activityIndex] ?? FUN_ACTIVITIES[0];
  const activityTimes = stats.watchTimeMin / currentActivity.minutes;
  const formattedCount = new Intl.NumberFormat(i18n.language || "tr-TR", {
    maximumFractionDigits: activityTimes >= 100 ? 0 : 2,
  }).format(activityTimes);

  const handleNextActivity = () => {
    setActivityIndex((prev) => (prev + 1) % FUN_ACTIVITIES.length);
  };

  const durationText = formatDurationLabel(formatDurationParts(stats.watchTimeMin), t);

  return (
    <div className="content-inset flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <p className="font-display italic text-snow text-6xl leading-none tracking-tight sm:text-7xl">
          {durationText}
        </p>
        <div className="flex items-center gap-2 text-muted">
          <p className="font-mono text-xs uppercase tracking-widest">
            {t(`stats.hero.activities.${currentActivity.id}`, {
              count: formattedCount,
            })}
          </p>
          <button
            type="button"
            onClick={handleNextActivity}
            className="rounded-full p-1 hover:bg-white/5 hover:text-snow transition-colors"
            title={t("stats.hero.activities.next")}
          >
            <RefreshCw size={14} />
          </button>
        </div>
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
