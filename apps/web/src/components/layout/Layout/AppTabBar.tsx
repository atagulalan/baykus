import { Link, useRouterState } from "@tanstack/react-router";
import { User } from "lucide-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Z } from "../../../lib/zIndex.ts";
import { ACTIVE_FILL, FORCE_FILL, isBrowsePath, NAV_ITEMS, useWatchBrowsePath } from "./layoutShared.ts";

export const AppTabBar = memo(function AppTabBar({ profileHandle }: { profileHandle: string }) {
  const { t } = useTranslation();
  const browseActive = useRouterState({ select: (s) => isBrowsePath(s.location.pathname) });
  const watchTo = useWatchBrowsePath();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 flex border-t border-white/5 bg-void pb-[env(safe-area-inset-bottom)] sm:hidden"
      style={{ viewTransitionName: "app-tabbar", zIndex: Z.chrome }}
    >
      {NAV_ITEMS.map(({ to, key, Icon, browse, activeClass }) => {
        const forceActive = browse && browseActive;
        return (
          <Link
            key={key}
            to={browse ? watchTo : to}
            {...(to === "/calendar" ? { activeOptions: { exact: false as const } } : {})}
            aria-label={t(key)}
            title={t(key)}
            className={`flex flex-1 items-center justify-center py-3 text-muted transition-colors hover:text-snow [&.active]:text-yellow ${activeClass}${
              forceActive ? ` text-yellow ${FORCE_FILL}` : ""
            }`}
          >
            <Icon size={20} strokeWidth={1.5} />
          </Link>
        );
      })}
      <Link
        to="/user/$handle"
        params={{ handle: profileHandle }}
        aria-label={t("app.nav.profile")}
        title={t("app.nav.profile")}
        className={`flex flex-1 items-center justify-center py-3 text-muted hover:text-snow transition-colors [&.active]:text-yellow ${ACTIVE_FILL}`}
      >
        <User size={20} strokeWidth={1.5} />
      </Link>
    </nav>
  );
});
