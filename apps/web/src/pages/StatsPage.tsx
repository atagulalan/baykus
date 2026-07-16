import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getStats } from "../api/client.ts";
import { ActivityHeatmapSection } from "../components/stats/ActivityHeatmapSection.tsx";
import { BacklogSection } from "../components/stats/BacklogSection.tsx";
import { BingesSection } from "../components/stats/BingesSection.tsx";
import { CategoryStatusSection } from "../components/stats/CategoryStatusSection.tsx";
import { FavoritesSection } from "../components/stats/FavoritesSection.tsx";
import { GenreDistributionSection } from "../components/stats/GenreDistributionSection.tsx";
import { HeroSection } from "../components/stats/HeroSection.tsx";
import { MostWatchedSection } from "../components/stats/MostWatchedSection.tsx";
import { NetworkDistributionSection } from "../components/stats/NetworkDistributionSection.tsx";
import { PaceSection } from "../components/stats/PaceSection.tsx";
import { ProductionSection } from "../components/stats/ProductionSection.tsx";
import { RecentSection } from "../components/stats/RecentSection.tsx";
import { RewatchSummarySection } from "../components/stats/RewatchSummarySection.tsx";
import { StreaksSection } from "../components/stats/StreaksSection.tsx";
import { UpcomingSection } from "../components/stats/UpcomingSection.tsx";
import { WeekdayHourSection } from "../components/stats/WeekdayHourSection.tsx";
import { YearlyTimeSection } from "../components/stats/YearlyTimeSection.tsx";

const RATING_BARS: {
  value: "1" | "2" | "3";
  Icon: React.ElementType;
  key: "bad" | "okay" | "good";
  color: string;
  iconColor: string;
}[] = [
  { value: "3", Icon: ArrowUp, key: "good", color: "bg-green-500/80", iconColor: "text-green-500" },
  { value: "2", Icon: Minus, key: "okay", color: "bg-yellow/80", iconColor: "text-yellow" },
  { value: "1", Icon: ArrowDown, key: "bad", color: "bg-red-500/80", iconColor: "text-red-500" },
];

export function StatsPage() {
  const { t } = useTranslation();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const query = useQuery({ queryKey: ["stats", tz], queryFn: () => getStats(tz) });

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {["a", "b", "c"].map((key) => (
            <div key={key} className="h-20 animate-pulse bg-white/5" />
          ))}
        </div>
        <div className="h-48 animate-pulse bg-white/5" />
        <div className="h-48 animate-pulse bg-white/5" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-muted">{t("errors.generic")}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="border border-white/10 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-snow px-3 py-1.5 transition-colors"
        >
          {t("errors.retry")}
        </button>
      </div>
    );
  }

  const stats = query.data;
  if (!stats) return null;

  const maxRatingCount = Math.max(1, ...RATING_BARS.map((r) => stats.ratingDistribution[r.value]));
  const { dated, total } = stats.datedWatches;

  return (
    <div className="flex flex-col gap-10">
      <HeroSection stats={stats} />
      <RecentSection stats={stats} />
      <MostWatchedSection stats={stats} />
      <CategoryStatusSection stats={stats} />
      <FavoritesSection stats={stats} />
      <ProductionSection stats={stats} />
      <GenreDistributionSection stats={stats} />
      <NetworkDistributionSection stats={stats} />
      <BacklogSection stats={stats} />
      <PaceSection stats={stats} />
      <UpcomingSection stats={stats} />
      <BingesSection stats={stats} />
      <RewatchSummarySection stats={stats} />
      <StreaksSection stats={stats} />
      <YearlyTimeSection stats={stats} />
      <ActivityHeatmapSection stats={stats} />
      <WeekdayHourSection stats={stats} />

      <section className="flex flex-col gap-4 mt-8">
        <h2 className="font-display italic text-snow text-2xl tracking-tight">
          {t("stats.ratingDistribution")}
        </h2>
        <div className="flex flex-col gap-3">
          {RATING_BARS.map((r) => {
            const count = stats.ratingDistribution[r.value];
            const label = t(`rating.${r.key}`);
            return (
              <div key={r.value} className="flex items-center gap-4 text-sm">
                <span className="flex w-24 shrink-0 items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-muted">
                  <r.Icon size={14} className={r.iconColor} /> {label}
                </span>
                <div className="h-2 flex-1 overflow-hidden bg-white/5">
                  <div
                    title={`${label}: ${count}`}
                    className={`h-full ${r.color} transition-all duration-500`}
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

      {dated < total && (
        <p className="text-center font-mono text-xs text-muted/70">
          {t("stats.footer.caveat", { dated, total })}
        </p>
      )}
    </div>
  );
}
