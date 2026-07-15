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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-40 border-zinc-800 border-b bg-zinc-950">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3 sm:gap-6">
          <Link to="/" className="font-bold text-lg">
            🦉 {t("app.name")}
          </Link>
          <SearchBar />
          <div className="hidden items-center gap-6 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-zinc-400 hover:text-zinc-100 [&.active]:text-zinc-100"
              >
                {t(item.key)}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-20 sm:pb-6">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-zinc-800 border-t bg-zinc-950 pb-[env(safe-area-inset-bottom)] sm:hidden">
        {navItems.map(({ to, key, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-zinc-500 [&.active]:text-zinc-100"
          >
            <Icon size={20} />
            <span className="text-[10px]">{t(key)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
