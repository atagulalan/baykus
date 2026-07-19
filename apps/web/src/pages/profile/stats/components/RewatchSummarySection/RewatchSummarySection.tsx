import { Link } from "@tanstack/react-router";
import { RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Stats } from "../../../../../api/types.ts";
import { pageViewTransition } from "../../../../../lib/pageViewTransition.ts";
import { HBarList } from "../HBarList/HBarList.tsx";
import { StatsSectionHeading } from "../StatsSectionHeading/StatsSectionHeading.tsx";
import { StatTile } from "../StatTile/StatTile.tsx";

interface RewatchSummarySectionProps {
  stats: Pick<Stats, "rewatchSummary" | "mostRewatched">;
}

/** spec.md §14 (E103) — Σ(watchCount-1) summary + per-series bars; keeps the existing per-episode E86 list below it. */
export function RewatchSummarySection({ stats }: RewatchSummarySectionProps) {
  const { t } = useTranslation();
  const { totalRewatches, rewatchedEpisodes, bySeries } = stats.rewatchSummary;
  if (totalRewatches === 0 && stats.mostRewatched.length === 0) return null;

  return (
    <section className="content-inset flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <StatsSectionHeading>{t("stats.rewatchSummary.title")}</StatsSectionHeading>
        {totalRewatches > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <StatTile
                label={t("stats.rewatchSummary.total")}
                value={totalRewatches.toLocaleString("tr-TR")}
              />
              <StatTile
                label={t("stats.rewatchSummary.episodes")}
                value={rewatchedEpisodes.toLocaleString("tr-TR")}
              />
            </div>
            <HBarList
              items={bySeries.map((s) => ({
                key: String(s.itemId),
                label: s.title,
                value: s.rewatches,
                displayValue: s.rewatches.toLocaleString("tr-TR"),
              }))}
            />
          </>
        )}
      </div>

      {stats.mostRewatched.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="font-display italic text-snow text-lg tracking-tight">
            {t("stats.mostRewatched")}
          </h3>
          <div className="flex flex-col gap-2">
            {stats.mostRewatched.map((ep) => (
              <Link
                key={ep.episodeId}
                to="/series/$id"
                params={{ id: String(ep.itemId) }}
                viewTransition={pageViewTransition}
                className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-snow">{ep.itemTitle}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    S{ep.s.toString().padStart(2, "0")}E{ep.e.toString().padStart(2, "0")}
                    {ep.episodeTitle ? `${t("common.separator")}${ep.episodeTitle}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs text-yellow">
                  <RotateCw size={14} />
                  <span>{ep.watchCount}x</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
