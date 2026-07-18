import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, ScrollRestoration, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { getAuthSession } from "../../../api/client.ts";
import { selfHandleParam } from "../../../lib/profilePath.ts";
import { AppHeader } from "./AppHeader.tsx";
import { AppTabBar } from "./AppTabBar.tsx";
import { BrowseOrOutlet } from "./BrowseOrOutlet.tsx";
import {
  BARE_PATHS,
  isProfileHeroPath,
  isPullToRefreshPath,
  isSeriesHeroPath,
} from "./layoutShared.ts";

export function Layout() {
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
      <AppHeader profileHandle={profileHandle} />
      <MainShell>
        <BrowseOrOutlet />
      </MainShell>
      <AppTabBar profileHandle={profileHandle} />
    </div>
  );
}

export function MainShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const heroBleed = isSeriesHeroPath(pathname) || isProfileHeroPath(pathname);
  const flushTop = isPullToRefreshPath(pathname);
  return (
    <main
      className={`mx-auto max-w-5xl pb-20 sm:pb-8 ${
        heroBleed ? "pt-0 -mt-[var(--app-header-height)]" : flushTop ? "pt-0 sm:pt-8" : "pt-8"
      }`}
    >
      {children}
    </main>
  );
}
