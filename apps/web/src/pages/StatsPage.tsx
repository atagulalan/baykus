import { useQuery } from "@tanstack/react-query";
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
  emoji: string;
  key: "bad" | "okay" | "good";
  color: string;
}[] = [
  { value: "1", emoji: "👎", key: "bad", color: "bg-red-500" },
  { value: "2", emoji: "😐", key: "okay", color: "bg-zinc-500" },
  { value: "3", emoji: "👍", key: "good", color: "bg-emerald-500" },
];

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-900 p-4">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="font-semibold text-2xl">{value}</p>
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
            <div key={key} className="h-20 animate-pulse rounded-lg bg-zinc-900" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-lg bg-zinc-900" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-zinc-400">{t("errors.generic")}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="rounded bg-zinc-800 px-3 py-1.5 text-sm"
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

      {stats.episodesWatched === 0 && <p className="text-sm text-zinc-400">{t("stats.empty")}</p>}

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-sm text-zinc-300">{t("stats.monthsChart")}</h2>
        <div className="flex items-end gap-2 border-zinc-800 border-b">
          {monthCounts.map(({ month, count }) => (
            <div key={month} className="flex h-32 flex-1 flex-col items-center justify-end gap-1">
              {count > 0 && <span className="text-[10px] text-zinc-400">{count}</span>}
              <div
                title={`${monthLabel(month)}: ${count}`}
                className="w-full max-w-5 rounded-t bg-emerald-500"
                style={{ height: `${Math.max(count > 0 ? 4 : 0, (count / maxMonthCount) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {monthCounts.map(({ month }) => (
            <span key={month} className="flex-1 text-center text-[10px] text-zinc-500">
              {monthLabel(month)}
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-sm text-zinc-300">{t("stats.ratingDistribution")}</h2>
        <div className="flex flex-col gap-2">
          {RATING_BARS.map((r) => {
            const count = stats.ratingDistribution[r.value];
            const label = t(`rating.${r.key}`);
            return (
              <div key={r.value} className="flex items-center gap-2 text-sm">
                <span className="w-20 shrink-0 text-zinc-400">
                  {r.emoji} {label}
                </span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-zinc-900">
                  <div
                    title={`${label}: ${count}`}
                    className={`h-full rounded-r ${r.color}`}
                    style={{
                      width: `${Math.max(count > 0 ? 4 : 0, (count / maxRatingCount) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs text-zinc-400 tabular-nums">
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
