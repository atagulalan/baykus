import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { CalendarDays, ChartColumn, LayoutGrid, Play, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getAuthSession } from "../api/client.ts";
import { SearchBar } from "./SearchBar.tsx";

const navItems = [
  { to: "/", key: "app.nav.library", Icon: LayoutGrid },
  { to: "/watch", key: "app.nav.watch", Icon: Play },
  { to: "/calendar", key: "app.nav.calendar", Icon: CalendarDays },
  { to: "/stats", key: "app.nav.stats", Icon: ChartColumn },
  { to: "/settings", key: "app.nav.settings", Icon: Settings },
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

  return (
    <div className="min-h-screen bg-void text-snow font-sans">
      <header
        className="sticky top-0 z-40 bg-void/90 backdrop-blur-md border-b border-white/5"
        style={{ viewTransitionName: "app-header" }}
      >
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="font-display italic text-snow text-2xl tracking-tight leading-none"
          >
            baykuş
          </Link>
          <div className="flex-1 max-w-md mx-6">
            <SearchBar />
          </div>
          <div className="hidden items-center gap-6 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="font-mono text-xs tracking-widest uppercase text-muted hover:text-snow transition-colors [&.active]:text-yellow"
              >
                {t(item.key)}
              </Link>
            ))}
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
        {navItems.map(({ to, key, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-1 flex-col items-center gap-1 py-3 text-muted hover:text-snow transition-colors [&.active]:text-yellow"
          >
            <Icon size={20} strokeWidth={1.5} />
            <span className="font-mono text-[9px] tracking-widest uppercase">{t(key)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
