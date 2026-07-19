import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { Stats } from "../../../../../api/types.ts";
import { pageViewTransition } from "../../../../../lib/pageViewTransition.ts";
import { StatsSectionHeading } from "../StatsSectionHeading/StatsSectionHeading.tsx";

interface FavoritesSectionProps {
  stats: Pick<Stats, "favoriteProgress">;
}

/** spec.md §6 (E108) — completion is distinct watched/aired non-special episodes, so it's ≤100% by construction. */
export function FavoritesSection({ stats }: FavoritesSectionProps) {
  const { t } = useTranslation();
  if (stats.favoriteProgress.length === 0) return null;

  return (
    <section className="content-inset flex flex-col gap-4">
      <StatsSectionHeading>{t("stats.favorites.title")}</StatsSectionHeading>
      <div className="grid grid-cols-1 gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
        {stats.favoriteProgress.map((item) => {
          const percent =
            item.airedEpisodes > 0
              ? Math.round((item.watchedEpisodes / item.airedEpisodes) * 100)
              : 0;
          return (
            <Link
              key={item.itemId}
              to="/series/$id"
              params={{ id: String(item.itemId) }}
              viewTransition={pageViewTransition}
              className="flex flex-col gap-2 rounded-md border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20"
            >
              <span className="truncate font-medium text-snow">{item.title}</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {t("stats.favorites.progress", { count: item.watchedEpisodes, percent })}
              </span>
              <div className="h-1 overflow-hidden rounded-full bg-white/5">
                <div
                  aria-hidden
                  className="h-full rounded-full bg-yellow transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
