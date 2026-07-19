import { Link } from "@tanstack/react-router";
import { User } from "lucide-react";
import { memo } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import { pageViewTransition } from "../../../lib/pageViewTransition.ts";
import { clearLastPosterItemId } from "../../../lib/posterTransition.ts";
import { Z } from "../../../lib/zIndex.ts";
import {
  ACTIVE_FILL,
  FORCE_DOCK_ACTIVE,
  FORCE_FILL,
  isBrowsePath,
  MOBILE_DOCK_TAB,
  NAV_ITEMS,
  useCommittedPathname,
  useWatchBrowsePath,
} from "./layoutShared.ts";

const ICON_SIZE = 22;
const ICON_STROKE = 1.75;

/** Drop armed poster before VT old snapshot (except browse — reverse morph). */
function disarmPosterMorph() {
  flushSync(() => clearLastPosterItemId());
}

export const AppTabBar = memo(function AppTabBar({ profileHandle }: { profileHandle: string }) {
  const { t } = useTranslation();
  const browseActive = isBrowsePath(useCommittedPathname());
  const watchTo = useWatchBrowsePath();
  const primaryItems = NAV_ITEMS.filter((item) => item.to !== "/search");
  const searchItem = NAV_ITEMS.find((item) => item.to === "/search");
  const SearchIcon = searchItem?.Icon;

  return (
    <nav
      data-app-tabbar
      className="pointer-events-none fixed inset-x-0 bottom-0 pt-12 sm:hidden"
      style={{
        viewTransitionName: "app-tabbar",
        zIndex: Z.chrome,
      }}
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {primaryItems.map(({ to, key, Icon, browse, activeClass }) => {
          const forceActive = browse && browseActive;
          return (
            <Link
              key={key}
              to={browse ? watchTo : to}
              viewTransition={pageViewTransition}
              {...(to === "/calendar" ? { activeOptions: { exact: false as const } } : {})}
              aria-label={t(key)}
              title={t(key)}
              onClick={browse ? undefined : disarmPosterMorph}
              className={`${MOBILE_DOCK_TAB} ${activeClass}${
                forceActive ? ` ${FORCE_DOCK_ACTIVE} ${FORCE_FILL}` : ""
              }`}
            >
              <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </Link>
          );
        })}
        <Link
          to="/user/$handle"
          params={{ handle: profileHandle }}
          viewTransition={pageViewTransition}
          aria-label={t("app.nav.profile")}
          title={t("app.nav.profile")}
          onClick={disarmPosterMorph}
          className={`${MOBILE_DOCK_TAB} ${ACTIVE_FILL}`}
        >
          <User size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </Link>
        {searchItem && SearchIcon && (
          <Link
            to={searchItem.to}
            viewTransition={pageViewTransition}
            aria-label={t(searchItem.key)}
            title={t(searchItem.key)}
            onClick={disarmPosterMorph}
            className={`${MOBILE_DOCK_TAB} ${searchItem.activeClass}`}
          >
            <SearchIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          </Link>
        )}
      </div>
    </nav>
  );
});
