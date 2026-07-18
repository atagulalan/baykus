import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { listSeries } from "../api/client.ts";
import { PageTitle } from "../components/PageTitle.tsx";
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
        <div className="content-inset hidden sm:block">
          <PageTitle>
            {t("profile.favorites.title")}
            {query.data && (
              <span className="ml-2 font-sans text-lg not-italic text-muted">
                ({favorites.length})
              </span>
            )}
          </PageTitle>
        </div>

        {query.isLoading ? (
          <div className={`${SERIES_GRID_CLASSNAME} content-inset`}>
            {["a", "b", "c", "d", "e", "f"].map((key) => (
              <div
                key={key}
                className="aspect-[2/3] animate-pulse bg-[#101010] border border-white/5"
              />
            ))}
          </div>
        ) : query.isError ? (
          <div className="content-inset mt-4 flex flex-col items-center gap-4 border border-white/5 bg-[#101010] py-24 text-center">
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
          <div className="content-inset mt-4 flex flex-col items-center gap-4 border border-white/5 bg-[#101010] py-24 text-center">
            <p className="font-mono text-xs text-muted/70">{t("profile.favorites.empty")}</p>
          </div>
        ) : (
          <div className={`${SERIES_GRID_CLASSNAME} content-inset`}>
            {favorites.map((series) => (
              <SeriesCard key={series.id} series={series} />
            ))}
          </div>
        )}
      </section>
    </PullToRefresh>
  );
}
