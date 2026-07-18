import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { List } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getAuthSession } from "../api/client.ts";
import { HOME_CATEGORY_ORDER } from "../api/types.ts";
import { CategorySection } from "../components/CategorySection.tsx";
import { PageTitle } from "../components/PageTitle.tsx";
import { PullToRefresh } from "../components/PullToRefresh.tsx";
import { SERIES_GRID_CLASSNAME } from "../lib/grid.ts";
import { selfHandleParam } from "../lib/profilePath.ts";
import { maybeStartSweep, useSweepProgress } from "../lib/staleSweep.ts";
import { updateUiPrefs } from "../lib/uiPrefs.ts";
import { useLibraryFilter } from "../lib/useLibraryFilter.ts";

/** Grid browse surface (`/`) — sort lives in each section's header (E128, spec 010 WP2).
 * View toggle lives in the page heading (E155); history is pull-to-open (E160). */
export function LibraryPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const sweepProgress = useSweepProgress();
  const sessionQuery = useQuery({ queryKey: ["auth-session"], queryFn: getAuthSession });
  const { sortFor, setSort, query, items, byCategory, categoriesToRender, hasVisibleItems } =
    useLibraryFilter(HOME_CATEGORY_ORDER);

  useEffect(() => {
    maybeStartSweep({
      onComplete: () => queryClient.invalidateQueries({ queryKey: ["library"] }),
    });
  }, [queryClient]);

  return (
    <PullToRefresh
      variant="history"
      onOpen={() => {
        void navigate({ to: "/watch/history" });
      }}
    >
      <section className="flex flex-col gap-6">
        {sweepProgress && (
          <p className="content-inset font-mono text-[10px] uppercase tracking-widest text-muted">
            {t("library.sweep.progress", { done: sweepProgress.done, total: sweepProgress.total })}
          </p>
        )}
        <div className="content-inset hidden items-center sm:flex">
          <PageTitle>{t("app.nav.library")}</PageTitle>
          <button
            type="button"
            onClick={() => {
              updateUiPrefs({ browseView: "list" });
              void navigate({ to: "/watch" });
            }}
            aria-label={t("library.view.list")}
            title={t("library.view.list")}
            className="ml-auto flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-snow"
          >
            <List size={20} strokeWidth={1.5} />
          </button>
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
        ) : !hasVisibleItems ? (
          <div className="content-inset mt-4 flex flex-col items-center gap-4 border border-white/5 bg-[#101010] py-24 text-center">
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
