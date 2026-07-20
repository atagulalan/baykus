import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { getAuthSession } from "../../../api/client.ts";
import { selfHandleParam } from "../../../lib/profilePath.ts";
import { AppEdgeBlur } from "./AppEdgeBlur.tsx";
import { AppHeader } from "./AppHeader.tsx";
import { AppTabBar } from "./AppTabBar.tsx";
import { BrowseOrOutlet } from "./BrowseOrOutlet.tsx";
import { BARE_PATHS } from "./layoutShared.ts";

export function Layout() {
  const { t } = useTranslation();
  const isBarePath = useRouterState({
    select: (s) => BARE_PATHS.has(s.location.pathname),
  });
  const sessionQuery = useQuery({ queryKey: ["auth-session"], queryFn: getAuthSession });

  if (isBarePath) {
    return <Outlet />;
  }

  if (sessionQuery.isLoading) return null;
  if (sessionQuery.data && !sessionQuery.data.authenticated) return <Navigate to="/login" />;

  const profileHandle = sessionQuery.data ? selfHandleParam(sessionQuery.data) : "me";

  return (
    <div className="min-h-screen bg-void text-snow font-sans">
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
  return (
    // VT name on a shell that freezes to 100dvh + overflow:hidden while
    // :active-view-transition — old/new snapshots share one frame size so the
    // cross-fade cannot aspect-stretch (browse↔hero main boxes differ).
    // pt clears the fixed header; heroes cancel it with -mt (E183).
    // Horizontal: MainShell stays full-bleed; pages that need a tablet gutter
    // (library / calendar / watch history `sm:px-3 lg:px-0`) opt in themselves (E183 amends E157).
    <div className="app-main-vt w-full bg-void" style={{ viewTransitionName: "app-main" }}>
      <main
        id="main-content"
        className="mx-auto max-w-5xl pt-[var(--app-header-height)] pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-8"
      >
        {children}
      </main>
    </div>
  );
}
