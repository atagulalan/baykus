import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getStats } from "../../../api/client.ts";
import { SkeletonStatsPage } from "../../../components/atoms/Skeleton/Skeleton.tsx";
import { ActivityHeatmapSection } from "./components/ActivityHeatmap/ActivityHeatmapSection.tsx";
import { BacklogSection } from "./components/BacklogSection/BacklogSection.tsx";
import { BingesSection } from "./components/BingesSection/BingesSection.tsx";
import { CategoryStatusSection } from "./components/CategoryStatusSection/CategoryStatusSection.tsx";
import { FavoritesSection } from "./components/FavoritesSection/FavoritesSection.tsx";
import { GenreDistributionSection } from "./components/GenreDistributionSection/GenreDistributionSection.tsx";
import { HeroSection } from "./components/HeroSection/HeroSection.tsx";
import { MostWatchedSection } from "./components/MostWatchedSection/MostWatchedSection.tsx";
import { NetworkDistributionSection } from "./components/NetworkDistributionSection/NetworkDistributionSection.tsx";
import { PaceSection } from "./components/PaceSection/PaceSection.tsx";
import { ProductionSection } from "./components/ProductionSection/ProductionSection.tsx";
import { RatingDistributionSection } from "./components/RatingDistributionSection/RatingDistributionSection.tsx";
import { RecentSection } from "./components/RecentSection/RecentSection.tsx";
import { RewatchSummarySection } from "./components/RewatchSummarySection/RewatchSummarySection.tsx";
import { StreaksSection } from "./components/StreaksSection/StreaksSection.tsx";
import { UpcomingSection } from "./components/UpcomingSection/UpcomingSection.tsx";
import { WeekdayHourSection } from "./components/WeekdayHourSection/WeekdayHourSection.tsx";
import { YearlyTimeSection } from "./components/YearlyTimeSection/YearlyTimeSection.tsx";

export function StatsPage() {
  const { t } = useTranslation();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const query = useQuery({ queryKey: ["stats", tz], queryFn: () => getStats(tz) });

  if (query.isLoading) {
    return <SkeletonStatsPage />;
  }

  if (query.isError) {
    return (
      <div className="content-inset flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-muted">{t("errors.generic")}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="rounded-md border border-white/10 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-snow px-3 py-1.5 transition-colors"
        >
          {t("errors.retry")}
        </button>
      </div>
    );
  }

  const stats = query.data;
  if (!stats) return null;

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
      <RatingDistributionSection stats={stats} />

      {dated < total && (
        <p className="content-inset text-center font-mono text-xs text-muted/70">
          {t("stats.footer.caveat", { dated, total })}
        </p>
      )}
    </div>
  );
}
