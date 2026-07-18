import { useTranslation } from "react-i18next";
import type { Stats } from "../../api/types.ts";
import { HBarList, type HBarListItem } from "./HBarList.tsx";
import { StatTile } from "./StatTile.tsx";

interface NetworkDistributionSectionProps {
  stats: Pick<Stats, "networkDistribution">;
}

/** spec.md §9 (E98) — each episode attributes to its item's first-listed network only (single-count). */
export function NetworkDistributionSection({ stats }: NetworkDistributionSectionProps) {
  const { t } = useTranslation();
  const { networkCount, top, other } = stats.networkDistribution;
  if (networkCount === 0) return null;

  const items: HBarListItem[] = top.map((n) => ({
    key: n.name,
    label: n.name,
    value: n.episodes,
    displayValue: n.episodes.toLocaleString("tr-TR"),
  }));
  if (other > 0) {
    items.push({
      key: "other",
      label: t("stats.distribution.other"),
      value: other,
      displayValue: other.toLocaleString("tr-TR"),
      muted: true,
    });
  }

  return (
    <section className="content-inset flex flex-col gap-4">
      <h2 className="font-display italic text-snow text-2xl tracking-tight">
        {t("stats.networkDistribution.title")}
      </h2>
      <StatTile
        label={t("stats.networkDistribution.networkCount")}
        value={networkCount.toLocaleString("tr-TR")}
      />
      <HBarList items={items} />
    </section>
  );
}
