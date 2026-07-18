import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getAuthSession } from "../api/client.ts";
import { HOME_CATEGORY_ORDER } from "../api/types.ts";
import { CategorySection } from "../components/CategorySection.tsx";
import { PullToRefresh, useLibrarySweepRefresh } from "../components/PullToRefresh.tsx";
import { SERIES_GRID_CLASSNAME } from "../lib/grid.ts";
import { selfHandleParam } from "../lib/profilePath.ts";
import { maybeStartSweep, useSweepProgress } from "../lib/staleSweep.ts";
import { useLibraryFilter } from "../lib/useLibraryFilter.ts";

/** Grid browse surface (`/`) — sort lives in each section's header (E128, spec 010 WP2).
 * View toggle lives in the app header (E142). */
export function LibraryPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const sweepProgress = useSweepProgress();
  const pullRefresh = useLibrarySweepRefresh();
  const sessionQuery = useQuery({ queryKey: ["auth-session"], queryFn: getAuthSession });
  const { sort, setSort, query, items, byCategory, categoriesToRender, hasVisibleItems } =
    useLibraryFilter(HOME_CATEGORY_ORDER);

  useEffect(() => {
    maybeStartSweep({
      onComplete: () => queryClient.invalidateQueries({ queryKey: ["library"] }),
    });
  }, [queryClient]);

  return (
    <PullToRefresh onRefresh={pullRefresh}>
      <section className="flex flex-col gap-6">
        {sweepProgress && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {t("library.sweep.progress", { done: sweepProgress.done, total: sweepProgress.total })}
          </p>
        )}
        <div className="hidden items-center justify-between sm:flex">
          <h1 className="font-display italic text-snow text-2xl tracking-tight">
            {t("app.nav.library")}
          </h1>
        </div>
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
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center border border-white/5 bg-[#101010] p-6 mt-4">
            <h1 className="font-display italic text-snow text-4xl tracking-tight">
              {t("library.empty.title")}
            </h1>
            <p className="font-mono text-xs text-muted/70">{t("library.empty.hint")}</p>
          </div>
        ) : !hasVisibleItems ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center border border-white/5 bg-[#101010] p-6 mt-4">
            <h1 className="font-display italic text-snow text-4xl tracking-tight">
              {t("library.empty.allDoneTitle")}
            </h1>
            <p className="font-mono text-xs text-muted/70">{t("library.empty.allDoneHint")}</p>
            {sessionQuery.data && (
              <Link
                to="/user/$handle/all-series"
                params={{ handle: selfHandleParam(sessionQuery.data) }}
                className="font-mono text-[10px] tracking-widest uppercase bg-yellow text-[#080808] px-4 py-2 mt-4 transition-opacity hover:opacity-90"
              >
                {t("profile.allSeries")}
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {categoriesToRender.map((c) => (
              <CategorySection
                key={c}
                category={c}
                items={byCategory.get(c) ?? []}
                sort={sort}
                onSortChange={setSort}
              />
            ))}
          </div>
        )}
      </section>
    </PullToRefresh>
  );
}
