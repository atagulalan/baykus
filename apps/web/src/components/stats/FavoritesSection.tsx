import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { Stats } from "../../api/types.ts";

interface FavoritesSectionProps {
  stats: Pick<Stats, "favoriteProgress">;
}

/** spec.md §6 (E108) — completion is distinct watched/aired non-special episodes, so it's ≤100% by construction. */
export function FavoritesSection({ stats }: FavoritesSectionProps) {
  const { t } = useTranslation();
  if (stats.favoriteProgress.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display italic text-snow text-2xl tracking-tight">
        {t("stats.favorites.title")}
      </h2>
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
              className="flex flex-col gap-2 border border-white/5 bg-[#101010] p-4 transition-colors hover:border-white/20"
            >
              <span className="truncate font-medium text-snow">{item.title}</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {t("stats.favorites.progress", { count: item.watchedEpisodes, percent })}
              </span>
              <div className="h-1 overflow-hidden bg-white/5">
                <div
                  aria-hidden
                  className="h-full bg-yellow/60 transition-all duration-500"
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
