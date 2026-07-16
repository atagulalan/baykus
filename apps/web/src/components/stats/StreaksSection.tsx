import { useTranslation } from "react-i18next";
import type { Stats } from "../../api/types.ts";
import { HBarList } from "./HBarList.tsx";
import { StatTile } from "./StatTile.tsx";

interface StreaksSectionProps {
  stats: Pick<Stats, "streaks">;
}

/** spec.md §15 (E104) — consecutive-ISO-week streaks; bySeries[0] is the most consistent series. */
export function StreaksSection({ stats }: StreaksSectionProps) {
  const { t } = useTranslation();
  const { longestWeeks, currentWeeks, bySeries } = stats.streaks;
  if (longestWeeks === 0) return null;
  const mostConsistent = bySeries[0];

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display italic text-snow text-2xl tracking-tight">
        {t("stats.streaks.title")}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label={t("stats.streaks.longest")}
          value={t("stats.streaks.weeks", { count: longestWeeks })}
        />
        <StatTile
          label={t("stats.streaks.current")}
          value={t("stats.streaks.weeks", { count: currentWeeks })}
        />
        {mostConsistent && (
          <StatTile
            label={t("stats.streaks.mostConsistent")}
            value={t("stats.streaks.weeks", { count: mostConsistent.weeks })}
            sub={mostConsistent.title}
          />
        )}
      </div>
      <HBarList
        items={bySeries.map((s) => ({
          key: String(s.itemId),
          label: s.title,
          value: s.weeks,
          displayValue: t("stats.streaks.weeks", { count: s.weeks }),
        }))}
      />
    </section>
  );
}
