import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Stats } from "../../../../../api/types.ts";
import { StatTile } from "../StatTile/StatTile.tsx";

interface ProductionSectionProps {
  stats: Pick<Stats, "production">;
}

const INITIAL_VISIBLE = 15;

/** spec.md §7 (E109) — ongoing = releaseStatus in {returning, in_production}; grid is alphabetical. */
export function ProductionSection({ stats }: ProductionSectionProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { ongoing, ended, ongoingItems } = stats.production;
  if (ongoing === 0 && ended === 0) return null;

  const visibleItems = expanded ? ongoingItems : ongoingItems.slice(0, INITIAL_VISIBLE);

  return (
    <section className="content-inset flex flex-col gap-4">
      <h2 className="font-display italic text-snow text-2xl tracking-tight">
        {t("stats.production.title")}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <StatTile label={t("stats.production.ongoing")} value={ongoing.toLocaleString("tr-TR")} />
        <StatTile label={t("stats.production.ended")} value={ended.toLocaleString("tr-TR")} />
      </div>
      {ongoingItems.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
            {visibleItems.map((item) => (
              <Link
                key={item.itemId}
                to="/series/$id"
                params={{ id: String(item.itemId) }}
                className="flex flex-col gap-1 border border-white/5 bg-[#101010] p-4 transition-colors hover:border-white/20"
              >
                <span className="truncate font-medium text-snow">{item.title}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  {t("stats.production.episodeProgress", {
                    watched: item.watchedEpisodes,
                    aired: item.airedEpisodes,
                  })}
                </span>
              </Link>
            ))}
          </div>
          {ongoingItems.length > INITIAL_VISIBLE && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="self-center border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-snow"
            >
              {expanded ? t("stats.production.showLess") : t("stats.production.showMore")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
