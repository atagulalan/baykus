import { useTranslation } from "react-i18next";
import type { Stats } from "../../api/types.ts";
import { formatDurationLabel, formatDurationParts } from "../../lib/date.ts";
import { HBarList } from "./HBarList.tsx";

interface MostWatchedSectionProps {
  stats: Pick<Stats, "mostWatchedByTime">;
}

/** spec.md §4 (E110) — top 12 items by summed watch time, rewatches included. */
export function MostWatchedSection({ stats }: MostWatchedSectionProps) {
  const { t } = useTranslation();
  if (stats.mostWatchedByTime.length === 0) return null;

  return (
    <section className="content-inset flex flex-col gap-4">
      <h2 className="font-display italic text-snow text-2xl tracking-tight">
        {t("stats.mostWatchedByTime.title")}
      </h2>
      <HBarList
        items={stats.mostWatchedByTime.map((item) => {
          const displayValue = formatDurationLabel(formatDurationParts(item.watchTimeMin), t);
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
