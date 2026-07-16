import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { CalendarDays, CircleUser, LayoutGrid, Play, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getAuthSession } from "../api/client.ts";
import { selfHandleParam } from "../lib/profilePath.ts";
import { SearchBar } from "./SearchBar.tsx";

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

  // /login and /claim render without nav chrome and manage their own
  // auth-redirect logic (they ARE the unauthenticated entry points).
  if (BARE_PATHS.has(pathname)) return <Outlet />;

  if (sessionQuery.isLoading) return null;
  if (sessionQuery.data && !sessionQuery.data.authenticated) return <Navigate to="/login" />;

  const profileHandle = sessionQuery.data ? selfHandleParam(sessionQuery.data) : "me";

  return (
    <div className="min-h-screen bg-void text-snow font-sans">
      <header
        className="sticky top-0 z-40 bg-void/90 backdrop-blur-md border-b border-white/5"
        style={{ viewTransitionName: "app-header" }}
      >
        <nav className="mx-auto max-w-5xl px-6 py-4">
          {/* Mobile (E67): single row — empty back-arrow slot (M26.2 fills it in), wordmark
              absolutely centered independent of side-slot widths, nothing on the right. */}
          <div className="relative flex items-center sm:hidden">
            <div className="h-11 w-11 shrink-0" aria-hidden="true" />
            <Link
              to="/"
              className="-translate-x-1/2 absolute left-1/2 font-display italic text-snow text-2xl leading-none tracking-tight"
            >
              baykuş
            </Link>
          </div>

          {/* Desktop: wordmark left, search center, text nav right — unchanged. */}
          <div className="hidden items-center justify-between sm:flex">
            <Link
              to="/"
              className="font-display italic text-snow text-2xl tracking-tight leading-none"
            >
              baykuş
            </Link>
            <div className="flex-1 max-w-md mx-6">
              <SearchBar />
            </div>
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
            </div>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8 pb-20 sm:pb-8">
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
