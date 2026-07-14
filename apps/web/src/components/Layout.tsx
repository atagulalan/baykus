import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getAuthSession } from "../api/client.ts";
import { SearchBar } from "./SearchBar.tsx";

const navItems = [
  { to: "/", key: "app.nav.library" },
  { to: "/calendar", key: "app.nav.calendar" },
  { to: "/stats", key: "app.nav.stats" },
  { to: "/settings", key: "app.nav.settings" },
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
      <header className="border-zinc-800 border-b">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3 sm:gap-6">
          <span className="font-bold text-lg">🦉 {t("app.name")}</span>
          <SearchBar />
          <div className="flex items-center gap-6">
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
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
