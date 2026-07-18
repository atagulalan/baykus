import { useTranslation } from "react-i18next";
import type { Stats } from "../../../../../api/types.ts";
import { StatTile } from "../StatTile/StatTile.tsx";

interface PaceSectionProps {
  stats: Pick<Stats, "pace">;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Local calendar date for "today + N weeks" — used in the catch-up projection. */
export function projectedCatchUpDate(weeks: number, now = new Date()): Date {
  return new Date(now.getTime() + weeks * MS_PER_WEEK);
}

/** spec.md §11 (E100) — dated watches / 56 days ÷ 8; hidden entirely when there's no recent activity. */
export function PaceSection({ stats }: PaceSectionProps) {
  const { t, i18n } = useTranslation();
  if (stats.pace === null) return null;
  const { episodesPerWeek, projectedWeeks } = stats.pace;

  const estimatedDate = projectedCatchUpDate(projectedWeeks).toLocaleDateString(
    i18n.language === "en" ? "en-US" : "tr-TR",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <section className="content-inset flex flex-col gap-4">
      <h2 className="font-display italic text-snow text-2xl tracking-tight">
        {t("stats.pace.title")}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile
          label={t("stats.pace.projectionLabel")}
          value={t("stats.pace.projection", { weeks: projectedWeeks })}
          sub={t("stats.pace.projectionDate", { date: estimatedDate })}
        />
        <StatTile
          label={t("stats.pace.label")}
          value={t("stats.pace.value", { count: Math.round(episodesPerWeek) })}
          sub={t("stats.pace.sub")}
        />
      </div>
    </section>
  );
}
