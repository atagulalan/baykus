import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, ScrollRestoration, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { getAuthSession } from "../../../api/client.ts";
import { selfHandleParam } from "../../../lib/profilePath.ts";
import { AppEdgeBlur } from "./AppEdgeBlur.tsx";
import { AppHeader } from "./AppHeader.tsx";
import { AppTabBar } from "./AppTabBar.tsx";
import { BrowseOrOutlet } from "./BrowseOrOutlet.tsx";
import {
  BARE_PATHS,
  isProfileHeroPath,
  isPullToRefreshPath,
  isSeriesHeroPath,
  useCommittedPathname,
} from "./layoutShared.ts";

export function Layout() {
  const { t } = useTranslation();
  const isBarePath = useRouterState({
    select: (s) => BARE_PATHS.has(s.location.pathname),
  });
  const sessionQuery = useQuery({ queryKey: ["auth-session"], queryFn: getAuthSession });

  if (isBarePath) {
    return (
      <>
        <ScrollRestoration />
        <Outlet />
      </>
    );
  }

  if (sessionQuery.isLoading) return null;
  if (sessionQuery.data && !sessionQuery.data.authenticated) return <Navigate to="/login" />;

  const profileHandle = sessionQuery.data ? selfHandleParam(sessionQuery.data) : "me";

  return (
    <div className="min-h-screen bg-void text-snow font-sans">
      <ScrollRestoration />
      <a href="#main-content" className="skip-link">
        {t("common.skipToMain")}
      </a>
      <AppEdgeBlur />
      <AppHeader profileHandle={profileHandle} />
      <MainShell>
        <BrowseOrOutlet />
      </MainShell>
      <AppTabBar profileHandle={profileHandle} />
    </div>
  );
}

export function MainShell({ children }: { children: ReactNode }) {
  // Committed match path — keep hero bleed stable until VT update commits.
  const pathname = useCommittedPathname();
  const heroBleed = isSeriesHeroPath(pathname) || isProfileHeroPath(pathname);
  const flushTop = isPullToRefreshPath(pathname);
  return (
    <main
      id="main-content"
      className={`mx-auto max-w-5xl pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-8 ${
        heroBleed ? "pt-0 -mt-[var(--app-header-height)]" : flushTop ? "pt-0 sm:pt-8" : "pt-8"
      } ${heroBleed ? "" : "sm:px-3 lg:px-0"}`}
      style={{ viewTransitionName: "app-main" }}
    >
      {children}
    </main>
  );
}
