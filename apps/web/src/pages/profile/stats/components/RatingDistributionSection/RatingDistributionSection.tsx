import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Stats } from "../../../../../api/types.ts";
import { StatsSectionHeading } from "../StatsSectionHeading/StatsSectionHeading.tsx";

const RATING_BARS: {
  value: "1" | "2" | "3";
  Icon: React.ElementType;
  key: "bad" | "okay" | "good";
  color: string;
  iconColor: string;
}[] = [
  {
    value: "3",
    Icon: ArrowUp,
    key: "good",
    color: "bg-green-500/80",
    iconColor: "text-green-500",
  },
  {
    value: "2",
    Icon: Minus,
    key: "okay",
    color: "bg-yellow/80",
    iconColor: "text-yellow",
  },
  {
    value: "1",
    Icon: ArrowDown,
    key: "bad",
    color: "bg-red-500/80",
    iconColor: "text-red-500",
  },
];

interface RatingDistributionSectionProps {
  stats: Pick<Stats, "ratingDistribution">;
}

export function RatingDistributionSection({ stats }: RatingDistributionSectionProps) {
  const { t } = useTranslation();
  const maxRatingCount = Math.max(1, ...RATING_BARS.map((r) => stats.ratingDistribution[r.value]));

  return (
    <section className="content-inset mt-8 flex flex-col gap-4">
      <StatsSectionHeading>{t("stats.ratingDistribution")}</StatsSectionHeading>
      <div className="flex flex-col gap-3">
        {RATING_BARS.map((r) => {
          const count = stats.ratingDistribution[r.value];
          const label = t(`rating.${r.key}`);
          return (
            <div key={r.value} className="flex items-center gap-4 text-sm">
              <span className="flex w-24 shrink-0 items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-muted">
                <r.Icon size={14} className={r.iconColor} /> {label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                <div
                  title={`${label}: ${count}`}
                  className={`h-full rounded-full ${r.color} transition-all duration-500`}
                  style={{
                    width: `${Math.max(count > 0 ? 4 : 0, (count / maxRatingCount) * 100)}%`,
                  }}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-xs text-muted tabular-nums">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
