import { useTranslation } from "react-i18next";
import type { Stats } from "../../../../../api/types.ts";
import { genreKey } from "../../../../../lib/genreKey.ts";
import { HBarList, type HBarListItem } from "../HBarList/HBarList.tsx";
import { StatsSectionHeading } from "../StatsSectionHeading/StatsSectionHeading.tsx";

interface GenreDistributionSectionProps {
  stats: Pick<Stats, "genreDistribution">;
}

/** spec.md §8 (E98) — an episode multi-counts toward every genre of its item; other may exceed the true total. */
export function GenreDistributionSection({ stats }: GenreDistributionSectionProps) {
  const { t } = useTranslation();
  const { top, other } = stats.genreDistribution;
  if (top.length === 0 && other === 0) return null;

  const items: HBarListItem[] = top.map((g) => ({
    key: g.name,
    label: t(`genres.${genreKey(g.name)}`, { defaultValue: g.name }),
    value: g.episodes,
    displayValue: g.episodes.toLocaleString("tr-TR"),
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
      <StatsSectionHeading>{t("stats.genreDistribution.title")}</StatsSectionHeading>
      <HBarList items={items} />
    </section>
  );
}
