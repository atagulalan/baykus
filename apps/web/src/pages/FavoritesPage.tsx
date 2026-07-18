import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { listSeries } from "../api/client.ts";
import { ProfileGuard } from "../components/ProfileGuard.tsx";
import { PullToRefresh, useLibrarySweepRefresh } from "../components/PullToRefresh.tsx";
import { SeriesCard } from "../components/SeriesCard.tsx";
import { SERIES_GRID_CLASSNAME } from "../lib/grid.ts";
import { byLastWatchedDesc } from "./ProfilePage.tsx";

/** E79: every favorite in the standard poster grid — the profile rail's overflow page. */
export function FavoritesPage() {
  const { handle } = useParams({ from: "/user/$handle/favorites" });

  return (
    <ProfileGuard handle={handle} to="/user/$handle/favorites">
      {() => <FavoritesPageContent />}
    </ProfileGuard>
  );
}

function FavoritesPageContent() {
  const { t } = useTranslation();
  const pullRefresh = useLibrarySweepRefresh();

  // Same query the profile rail uses — client-filtered, no new endpoint or key.
  const query = useQuery({
    queryKey: ["library", "lastWatched"],
    queryFn: () => listSeries({ sort: "lastWatched" }),
  });

  const favorites = (query.data?.items ?? [])
    .filter((series) => series.favorite)
    .sort(byLastWatchedDesc);

  return (
    <PullToRefresh onRefresh={pullRefresh}>
      <section className="flex flex-col gap-6">
        <h1 className="hidden font-display italic text-snow text-3xl tracking-tight sm:block">
          {t("profile.favorites.title")}
          {query.data && (
            <span className="font-sans not-italic text-lg text-muted ml-2">
              ({favorites.length})
            </span>
          )}
        </h1>

        {query.isLoading ? (
          <div className={SERIES_GRID_CLASSNAME}>
            {["a", "b", "c", "d", "e", "f"].map((key) => (
              <div
                key={key}
                className="aspect-[2/3] animate-pulse bg-[#101010] border border-white/5"
              />
            ))}
          </div>
        ) : query.isError ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center border border-white/5 bg-[#101010] p-6 mt-4">
            <p className="font-mono text-xs text-muted uppercase tracking-widest">
              {t("errors.generic")}
            </p>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="font-mono text-[10px] tracking-widest uppercase border border-white/10 text-snow px-4 py-2 hover:bg-white/5 transition-colors"
            >
              {t("errors.retry")}
            </button>
          </div>
        ) : favorites.length === 0 ? (
          // E79: zero-favorites deep link — the existing hint, no redirect.
          <div className="flex flex-col items-center gap-4 py-24 text-center border border-white/5 bg-[#101010] p-6 mt-4">
            <p className="font-mono text-xs text-muted/70">{t("profile.favorites.empty")}</p>
          </div>
        ) : (
          <div className={SERIES_GRID_CLASSNAME}>
            {favorites.map((series) => (
              <SeriesCard key={series.id} series={series} />
            ))}
          </div>
        )}
      </section>
    </PullToRefresh>
  );
}
