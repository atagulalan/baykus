import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { listSeries } from "../../api/client.ts";
import { PageTitle } from "../../components/atoms/PageTitle/PageTitle.tsx";
import { SkeletonSeriesGrid } from "../../components/atoms/Skeleton/Skeleton.tsx";
import { ProfileGuard } from "../../components/layout/ProfileGuard/ProfileGuard.tsx";
import {
  PullToRefresh,
  useLibrarySweepRefresh,
} from "../../components/molecules/PullToRefresh/PullToRefresh.tsx";
import { SeriesCard } from "../../components/molecules/SeriesCard/SeriesCard.tsx";
import { SERIES_GRID_CLASSNAME } from "../../lib/grid.ts";
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
      <section className="page-top-flush flex flex-col gap-6">
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
          <SkeletonSeriesGrid count={6} />
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
            <p className="font-sans text-sm text-muted">{t("profile.favorites.empty")}</p>
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
