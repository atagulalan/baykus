import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CATEGORY_ORDER } from "../../api/types.ts";
import { PageTitle } from "../../components/atoms/PageTitle/PageTitle.tsx";
import { SkeletonCategoryGrid } from "../../components/atoms/Skeleton/Skeleton.tsx";
import { ProfileGuard } from "../../components/layout/ProfileGuard/ProfileGuard.tsx";
import { AddSectionBar } from "../../components/molecules/AddSectionBar/AddSectionBar.tsx";
import {
  PullToRefresh,
  useLibrarySweepRefresh,
} from "../../components/molecules/PullToRefresh/PullToRefresh.tsx";
import { CategorySection } from "../../components/organisms/CategorySection/CategorySection.tsx";
import { useLibraryFilter } from "../../lib/useLibraryFilter.ts";

/** E60: full seven-category library grid. Per-section sort via header dialog (sortOnly AddSectionBar). */
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
  const { sortFor, setSort, sectionSorts, query, items, byCategory, categoriesToRender } =
    useLibraryFilter(CATEGORY_ORDER);

  const showContent = !query.isLoading && !query.isError && items.length > 0;

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
          {showContent ? (
            <AddSectionBar
              mode="sortOnly"
              sections={categoriesToRender}
              sectionSorts={sectionSorts}
              onSortChange={setSort}
            />
          ) : null}
        </div>
        {query.isLoading ? (
          <SkeletonCategoryGrid sections={2} />
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
              />
            ))}
          </div>
        )}
      </section>
    </PullToRefresh>
  );
}
