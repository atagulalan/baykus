import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CATEGORY_ORDER } from "../../api/types.ts";
import { CategorySection } from "../../components/organisms/CategorySection/CategorySection.tsx";
import { PageTitle } from "../../components/atoms/PageTitle/PageTitle.tsx";
import { ProfileGuard } from "../../components/layout/ProfileGuard/ProfileGuard.tsx";
import { PullToRefresh, useLibrarySweepRefresh } from "../../components/molecules/PullToRefresh/PullToRefresh.tsx";
import { SERIES_GRID_CLASSNAME } from "../../lib/grid.ts";
import { useLibraryFilter } from "../../lib/useLibraryFilter.ts";

/** E60: the full seven-category library, relocated off the home page — no refresh-all button,
 * no auto-sweep; the E132 pull gesture is the one deliberate exception. Sort lives in each
 * section's header (spec 010 WP2); no category add/remove here, every category always renders. */
export function AllSeriesPage() {
  const { handle } = useParams({ from: "/user/$handle/all-series" });

  return (
    <ProfileGuard handle={handle} to="/user/$handle/all-series">
      {() => <AllSeriesPageContent />}
    </ProfileGuard>
  );
}

function AllSeriesPageContent() {
  const { t } = useTranslation();
  const pullRefresh = useLibrarySweepRefresh();
  const { sortFor, setSort, query, items, byCategory, categoriesToRender } =
    useLibraryFilter(CATEGORY_ORDER);

  return (
    <PullToRefresh onRefresh={pullRefresh}>
      <section className="flex flex-col gap-6">
        <div className="content-inset hidden flex-wrap items-center justify-between gap-2 sm:flex">
          <PageTitle>
            {t("profile.allSeries")}
            {query.data && (
              <span className="ml-2 font-sans text-lg not-italic text-muted">
                ({query.data.total})
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
        ) : items.length === 0 ? (
          <div className="content-inset mt-4 flex flex-col items-center gap-4 border border-white/5 bg-[#101010] py-24 text-center">
            <h1 className="font-display italic text-snow text-4xl tracking-tight">
              {t("library.empty.title")}
            </h1>
            <p className="font-mono text-xs text-muted/70">{t("library.empty.hint")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {categoriesToRender.map((c) => (
              <CategorySection
                key={c}
                category={c}
                items={byCategory.get(c) ?? []}
                sort={sortFor(c)}
                onSortChange={(sort) => setSort(c, sort)}
              />
            ))}
          </div>
        )}
      </section>
    </PullToRefresh>
  );
}
