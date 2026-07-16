import { useQuery } from "@tanstack/react-query";
import {
  Link,
  Navigate,
  Outlet,
  useCanGoBack,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, CircleUser, LayoutGrid, Play, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getAuthSession } from "../api/client.ts";
import { backAffordance } from "../lib/backFallback.ts";
import { selfHandleParam } from "../lib/profilePath.ts";

/** E67: shared by the desktop text nav and the mobile tab bar (Profil excluded — needs the resolved handle). */
const NAV_ITEMS = [
  { to: "/", key: "app.nav.library", Icon: LayoutGrid },
  { to: "/watch", key: "app.nav.watch", Icon: Play },
  { to: "/calendar", key: "app.nav.calendar", Icon: CalendarDays },
] as const;

const BARE_PATHS = new Set(["/login", "/claim"]);

export function Layout() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const sessionQuery = useQuery({ queryKey: ["auth-session"], queryFn: getAuthSession });
  const canGoBack = useCanGoBack();
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement>(null);

  // E73: publishes the sticky header's real height as a CSS var so pages (the calendar's
  // BUGÜN anchor) can scroll-margin-top against a measured value, never a guessed constant.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    function updateHeight() {
      if (el) {
        document.documentElement.style.setProperty(
          "--app-header-height",
          `${el.getBoundingClientRect().height}px`,
        );
      }
    }
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // /login and /claim render without nav chrome and manage their own
  // auth-redirect logic (they ARE the unauthenticated entry points).
  if (BARE_PATHS.has(pathname)) return <Outlet />;

  if (sessionQuery.isLoading) return null;
  if (sessionQuery.data && !sessionQuery.data.authenticated) return <Navigate to="/login" />;

  const profileHandle = sessionQuery.data ? selfHandleParam(sessionQuery.data) : "me";
  const back = backAffordance(pathname, profileHandle);

  return (
    <div className="min-h-screen bg-void text-snow font-sans">
      <header
        ref={headerRef}
        className="sticky top-0 z-40 bg-void/90 backdrop-blur-md border-b border-white/5"
        style={{ viewTransitionName: "app-header" }}
      >
        <nav className="mx-auto max-w-5xl px-6 py-4">
          {/* Mobile (E67): single row — back-arrow slot on the left (E72, empty on tab-bar
              pages), wordmark absolutely centered independent of side-slot widths, nothing
              on the right. */}
          <div className="relative flex items-center sm:hidden">
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
            <Link
              to="/"
              className="-translate-x-1/2 absolute left-1/2 font-display italic text-snow text-2xl leading-none tracking-tight"
            >
              baykuş
            </Link>
          </div>

          {/* Desktop (E77): wordmark left, nav cluster right ending in the search icon-link —
              the center inline-search slot is gone (dropdown retired); /search is header-only on desktop. */}
          <div className="hidden items-center justify-between sm:flex">
            <Link
              to="/"
              className="font-display italic text-snow text-2xl tracking-tight leading-none"
            >
              baykuş
            </Link>
            <div className="flex items-center gap-6">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="font-mono text-xs tracking-widest uppercase text-muted hover:text-snow transition-colors [&.active]:text-yellow"
                >
                  {t(item.key)}
                </Link>
              ))}
              <Link
                to="/user/$handle"
                params={{ handle: profileHandle }}
                className="font-mono text-xs tracking-widest uppercase text-muted hover:text-snow transition-colors [&.active]:text-yellow"
              >
                {t("app.nav.profile")}
              </Link>
              <Link
                to="/search"
                aria-label={t("app.nav.search")}
                className="flex h-11 w-11 items-center justify-center text-muted hover:text-snow transition-colors [&.active]:text-yellow"
              >
                <Search size={20} strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-3 py-8 pb-20 sm:px-6 sm:pb-8">
        <Outlet />
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/5 bg-void/90 backdrop-blur pb-[env(safe-area-inset-bottom)] sm:hidden"
        style={{ viewTransitionName: "app-tabbar" }}
      >
        {NAV_ITEMS.map(({ to, key, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-1 flex-col items-center gap-1 py-3 text-muted hover:text-snow transition-colors [&.active]:text-yellow"
          >
            <Icon size={20} strokeWidth={1.5} />
            <span className="font-mono text-[9px] tracking-widest uppercase">{t(key)}</span>
          </Link>
        ))}
        <Link
          to="/search"
          className="flex flex-1 flex-col items-center gap-1 py-3 text-muted hover:text-snow transition-colors [&.active]:text-yellow"
        >
          <Search size={20} strokeWidth={1.5} />
          <span className="font-mono text-[9px] tracking-widest uppercase">
            {t("app.nav.search")}
          </span>
        </Link>
        <Link
          to="/user/$handle"
          params={{ handle: profileHandle }}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-muted hover:text-snow transition-colors [&.active]:text-yellow"
        >
          <CircleUser size={20} strokeWidth={1.5} />
          <span className="font-mono text-[9px] tracking-widest uppercase">
            {t("app.nav.profile")}
          </span>
        </Link>
      </nav>
    </div>
  );
}
