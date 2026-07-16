import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getStats } from "../api/client.ts";
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

function last12Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(`${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(
    new Date(Date.UTC(year as number, (m as number) - 1, 1)),
  );
}

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

  const months = last12Months();
  const countByMonth = new Map(stats.episodesPerMonth.map((m) => [m.month, m.count]));
  const monthCounts = months.map((month) => ({ month, count: countByMonth.get(month) ?? 0 }));
  const maxMonthCount = Math.max(1, ...monthCounts.map((m) => m.count));
  const maxRatingCount = Math.max(1, ...RATING_BARS.map((r) => stats.ratingDistribution[r.value]));

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

      <section className="flex flex-col gap-4 mt-4">
        <h2 className="font-display italic text-snow text-2xl tracking-tight">
          {t("stats.monthsChart")}
        </h2>
        <div className="flex items-end gap-2 border-b border-white/5 pb-2">
          {monthCounts.map(({ month, count }) => (
            <div key={month} className="flex h-32 flex-1 flex-col items-center justify-end gap-1">
              {count > 0 && <span className="font-mono text-[9px] text-muted/50">{count}</span>}
              <div
                title={`${monthLabel(month)}: ${count}`}
                className="w-full max-w-5 bg-yellow/60 transition-all duration-500"
                style={{ height: `${Math.max(count > 0 ? 4 : 0, (count / maxMonthCount) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {monthCounts.map(({ month }) => (
            <span
              key={month}
              className="flex-1 text-center font-mono text-[9px] uppercase tracking-widest text-muted/50"
            >
              {monthLabel(month)}
            </span>
          ))}
        </div>
      </section>

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
    </div>
  );
}
