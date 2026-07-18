import { useQuery } from "@tanstack/react-query";
import {
  Link,
  Navigate,
  Outlet,
  ScrollRestoration,
  useCanGoBack,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, LayoutGrid, List, Play, Search, User } from "lucide-react";
import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAuthSession } from "../api/client.ts";
import { backAffordance } from "../lib/backFallback.ts";
import { selfHandleParam } from "../lib/profilePath.ts";
import { readBrowsePath, updateUiPrefs } from "../lib/uiPrefs.ts";
import { Z } from "../lib/zIndex.ts";

/** E67 / E138: desktop + mobile tab bar. Library grid is a peer view of Watch (E142). */
const NAV_ITEMS = [
  { to: "/watch" as const, key: "app.nav.watch", Icon: Play, browse: true as const },
  { to: "/calendar" as const, key: "app.nav.calendar", Icon: CalendarDays, browse: false as const },
  { to: "/search" as const, key: "app.nav.search", Icon: Search, browse: false as const },
];

const BARE_PATHS = new Set(["/login", "/claim"]);

function isBrowsePath(pathname: string): boolean {
  return pathname === "/" || pathname === "/watch";
}

/** Re-read browse path when the route changes (toggle persists + navigate). */
function useWatchBrowsePath(): "/" | "/watch" {
  useRouterState({ select: (s) => s.location.pathname });
  return readBrowsePath();
}

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
        <Outlet />
      </MainShell>
      <AppTabBar profileHandle={profileHandle} />
    </div>
  );
}

function MobileBackButton({ profileHandle }: { profileHandle: string }) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const canGoBack = useCanGoBack();
  const navigate = useNavigate();
  const back = backAffordance(pathname, profileHandle);

  return (
    <div className="h-11 w-11 shrink-0">
      {back && (
        <button
          type="button"
          onClick={() => {
            if (canGoBack) window.history.back();
            else navigate(back);
          }}
          aria-label={t("app.back")}
          className="flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-snow"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}

/** E142: list↔grid toggle — shows the *current* view icon; tap switches + persists. */
function BrowseViewToggle({
  className = "",
  spacerWhenHidden = false,
}: {
  className?: string;
  /** Mobile header: keep a matching right slot so the wordmark stays centered. */
  spacerWhenHidden?: boolean;
}) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  if (!isBrowsePath(pathname)) {
    return spacerWhenHidden ? <div className={`h-11 w-11 shrink-0 ${className}`} /> : null;
  }

  const isGrid = pathname === "/";
  const Icon = isGrid ? LayoutGrid : List;
  const label = isGrid ? t("library.view.grid") : t("library.view.list");

  return (
    <div className={`h-11 w-11 shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => {
          const next = isGrid ? "list" : "grid";
          updateUiPrefs({ browseView: next });
          void navigate({ to: next === "grid" ? "/" : "/watch" });
        }}
        aria-label={label}
        title={label}
        className="flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-snow"
      >
        <Icon size={20} strokeWidth={1.5} />
      </button>
    </div>
  );
}

function isPullToRefreshPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/watch" ||
    pathname === "/calendar" ||
    pathname.startsWith("/calendar/") ||
    pathname.endsWith("/all-series") ||
    pathname.endsWith("/favorites")
  );
}

/** E146: series detail hero starts at viewport top beneath the transparent header. */
function isSeriesHeroPath(pathname: string): boolean {
  return pathname.startsWith("/series/") && pathname !== "/series/new";
}

function MainShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const seriesHero = isSeriesHeroPath(pathname);
  const flushTop = isPullToRefreshPath(pathname);
  return (
    <main
      className={`mx-auto max-w-5xl px-3 pb-20 sm:px-6 sm:pb-8 ${
        seriesHero ? "pt-0 -mt-[var(--app-header-height)]" : flushTop ? "pt-0 sm:pt-8" : "pt-8"
      }`}
    >
      {children}
    </main>
  );
}

const AppHeader = memo(function AppHeader({ profileHandle }: { profileHandle: string }) {
  const { t } = useTranslation();
  const headerObserverRef = useRef<ResizeObserver | null>(null);
  const [isStuck, setIsStuck] = useState(false);
  const browseActive = useRouterState({ select: (s) => isBrowsePath(s.location.pathname) });
  const watchTo = useWatchBrowsePath();

  useEffect(() => {
    function updateStuckState() {
      setIsStuck(window.scrollY > 0);
    }

    updateStuckState();
    window.addEventListener("scroll", updateStuckState, { passive: true });
    return () => window.removeEventListener("scroll", updateStuckState);
  }, []);

  const headerRef = useCallback((el: HTMLElement | null) => {
    headerObserverRef.current?.disconnect();
    headerObserverRef.current = null;
    if (!el) return;
    const header = el;
    function updateHeight() {
      document.documentElement.style.setProperty(
        "--app-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    }
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    headerObserverRef.current = observer;
  }, []);

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 transition-colors duration-200 ${
        isStuck
          ? "bg-void/95 backdrop-blur"
          : "bg-[linear-gradient(to_bottom,#000_0%,transparent_100%)]"
      }`}
      style={{ viewTransitionName: "app-header", zIndex: Z.chrome }}
    >
      <nav className="mx-auto max-w-5xl px-3 py-4 sm:px-6">
        {/* Mobile: back | centered wordmark | view toggle (E142, browse only). */}
        <div className="relative flex items-center justify-between sm:hidden">
          <MobileBackButton profileHandle={profileHandle} />
          <Link
            to={watchTo}
            className="-translate-x-1/2 absolute left-1/2 font-display italic text-snow text-2xl leading-none tracking-tight"
          >
            baykuş
          </Link>
          <BrowseViewToggle spacerWhenHidden />
        </div>

        {/* Desktop: watch + calendar | centered wordmark | search + profile. */}
        <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-4 sm:grid">
          <div className="flex items-center justify-start gap-2">
            {NAV_ITEMS.slice(0, 2).map((item) => (
              <Link
                key={item.key}
                to={item.browse ? "/watch" : item.to}
                {...(item.to === "/calendar" ? { activeOptions: { exact: false as const } } : {})}
                aria-label={t(item.key)}
                title={t(item.key)}
                className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-void/70 text-muted shadow-lg backdrop-blur-md transition-colors hover:border-white/20 hover:text-snow [&.active]:text-yellow${
                  item.browse && browseActive ? " text-yellow" : ""
                }`}
              >
                <item.Icon size={16} strokeWidth={1.5} />
              </Link>
            ))}
          </div>
          <Link
            to={watchTo}
            className="font-display italic text-snow text-2xl tracking-tight leading-none"
          >
            baykuş
          </Link>
          <div className="flex items-center justify-end gap-2">
            <Link
              to="/search"
              aria-label={t("app.nav.search")}
              title={t("app.nav.search")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-void/70 text-muted shadow-lg backdrop-blur-md transition-colors hover:border-white/20 hover:text-snow [&.active]:text-yellow"
            >
              <Search size={16} strokeWidth={1.5} />
            </Link>
            <Link
              to="/user/$handle"
              params={{ handle: profileHandle }}
              aria-label={t("app.nav.profile")}
              title={t("app.nav.profile")}
              className="flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-snow [&.active]:text-yellow"
            >
              <User size={18} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
});

const AppTabBar = memo(function AppTabBar({ profileHandle }: { profileHandle: string }) {
  const { t } = useTranslation();
  const browseActive = useRouterState({ select: (s) => isBrowsePath(s.location.pathname) });
  const watchTo = useWatchBrowsePath();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 flex border-t border-white/5 bg-void pb-[env(safe-area-inset-bottom)] sm:hidden"
      style={{ viewTransitionName: "app-tabbar", zIndex: Z.chrome }}
    >
      {NAV_ITEMS.map(({ to, key, Icon, browse }) => {
        const forceActive = browse && browseActive;
        return (
          <Link
            key={key}
            to={browse ? watchTo : to}
            {...(to === "/calendar" ? { activeOptions: { exact: false as const } } : {})}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-muted transition-colors hover:text-snow [&.active]:text-yellow${
              forceActive ? " text-yellow" : ""
            }`}
          >
            <Icon size={20} strokeWidth={1.5} />
            <span className="font-mono text-[9px] tracking-widest uppercase">{t(key)}</span>
          </Link>
        );
      })}
      <Link
        to="/user/$handle"
        params={{ handle: profileHandle }}
        className="flex flex-1 flex-col items-center gap-1 py-3 text-muted hover:text-snow transition-colors [&.active]:text-yellow"
      >
        <User size={20} strokeWidth={1.5} />
        <span className="font-mono text-[9px] tracking-widest uppercase">
          {t("app.nav.profile")}
        </span>
      </Link>
    </nav>
  );
});
