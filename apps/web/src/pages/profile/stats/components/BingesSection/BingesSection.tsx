import { useTranslation } from "react-i18next";
import type { Stats } from "../../../../../api/types.ts";
import { HBarList } from "../HBarList/HBarList.tsx";

interface BingesSectionProps {
  stats: Pick<Stats, "binges">;
}

/** spec.md §13 (E102) — top 10 (item, local day) pairs by distinct-episode count, dated watches only. */
export function BingesSection({ stats }: BingesSectionProps) {
  const { t } = useTranslation();
  if (stats.binges.length === 0) return null;

  return (
    <section className="content-inset flex flex-col gap-4">
      <h2 className="font-display italic text-snow text-2xl tracking-tight">
        {t("stats.binges.title")}
      </h2>
      <HBarList
        items={stats.binges.map((b) => ({
          key: `${b.itemId}-${b.date}`,
          label: `${b.title}${t("common.separator")}${b.date}`,
          value: b.episodes,
          displayValue: t("stats.binges.episodesShort", { count: b.episodes }),
        }))}
      />
    </section>
  );
}
