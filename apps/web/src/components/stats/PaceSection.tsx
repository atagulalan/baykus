import { useTranslation } from "react-i18next";
import type { Stats } from "../../api/types.ts";
import { StatTile } from "./StatTile.tsx";

interface PaceSectionProps {
  stats: Pick<Stats, "pace">;
}

/** spec.md §11 (E100) — dated watches / 56 days ÷ 8; hidden entirely when there's no recent activity. */
export function PaceSection({ stats }: PaceSectionProps) {
  const { t } = useTranslation();
  if (stats.pace === null) return null;
  const { episodesPerWeek, projectedWeeks } = stats.pace;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display italic text-snow text-2xl tracking-tight">
        {t("stats.pace.title")}
      </h2>
      <StatTile
        label={t("stats.pace.label")}
        value={t("stats.pace.value", { count: Math.round(episodesPerWeek) })}
        sub={t("stats.pace.sub")}
      />
      <p className="text-center font-mono text-sm text-muted">
        {t("stats.pace.projection", { weeks: projectedWeeks })}
      </p>
    </section>
  );
}
