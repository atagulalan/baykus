import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getStats } from "../api/client.ts";

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

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-3 border border-white/5 bg-[#101010] p-6 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">{label}</p>
      <p className="font-display italic text-snow text-4xl leading-none tracking-tight">{value}</p>
    </div>
  );
}

export function StatsPage() {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: ["stats"], queryFn: getStats });

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
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label={t("stats.episodesWatched")}
          value={stats.episodesWatched.toLocaleString("tr-TR")}
        />
        <StatTile
          label={t("stats.watchTimeHours")}
          value={Math.round(stats.watchTimeMin / 60).toLocaleString("tr-TR")}
        />
        <StatTile
          label={t("stats.activeSeries")}
          value={stats.itemCount.watching.toLocaleString("tr-TR")}
        />
      </div>

      {stats.episodesWatched === 0 && (
        <p className="text-sm font-mono text-muted text-center">{t("stats.empty")}</p>
      )}

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
