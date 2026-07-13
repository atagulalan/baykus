import { Link, Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

const navItems = [
  { to: "/", key: "app.nav.library" },
  { to: "/calendar", key: "app.nav.calendar" },
  { to: "/stats", key: "app.nav.stats" },
  { to: "/settings", key: "app.nav.settings" },
] as const;

export function Layout() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-zinc-800 border-b">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <span className="font-bold text-lg">🦉 {t("app.name")}</span>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-zinc-400 hover:text-zinc-100 [&.active]:text-zinc-100"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
