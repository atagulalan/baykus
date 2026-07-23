import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, User } from "lucide-react";
import { memo, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import { getSettings } from "../../../api/client.ts";
import { buildAvatarUrl } from "../../../api/images.ts";
import { backAffordance } from "../../../lib/backFallback.ts";
import { navigateMobileBack } from "../../../lib/navBackStack.ts";
import { pageViewTransition } from "../../../lib/pageViewTransition.ts";
import { clearLastPosterItemId } from "../../../lib/posterTransition.ts";
import { Z } from "../../../lib/zIndex.ts";
import { MediaImage } from "../../atoms/MediaImage/MediaImage.tsx";
import { MobileHeaderAction } from "./LayoutToggles.tsx";
import {
  ACTIVE_FILL,
  APP_HEADER_HOOK,
  FORCE_FILL,
  isBannerChromePage,
  isBrowsePath,
  NAV_ITEMS,
  NAV_REVEAL_DELAYS,
  useCommittedPathname,
  useWatchBrowsePath,
} from "./layoutShared.ts";

function disarmPosterMorph() {
  flushSync(() => clearLastPosterItemId());
}

function MobileBackButton({
  profileHandle,
  pathname,
}: {
  profileHandle: string;
  pathname: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const back = backAffordance(pathname, profileHandle);

  return (
    <div className="h-11 w-11 shrink-0">
      {back && (
        <button
          type="button"
          onClick={() => {
            // Back from series → browse keeps the armed poster for reverse morph.
            if (!(pathname.startsWith("/series/") && back.to === "/watch")) {
              disarmPosterMorph();
            }
            navigateMobileBack(navigate, back);
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

export const AppHeader = memo(function AppHeader({ profileHandle }: { profileHandle: string }) {
  const { t } = useTranslation();
  const headerObserverRef = useRef<ResizeObserver | null>(null);
  // Committed match path — not location — so banner/nav chrome doesn't snap
  // before the view-transition old snapshot is taken (E51).
  const pathname = useCommittedPathname();
  const browseActive = isBrowsePath(pathname);
  const watchTo = useWatchBrowsePath();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
  /** Dock-hide only when a real banner/hero is present (series always; profile if bannerRef). */
  const isBannerPage = isBannerChromePage(pathname, settingsQuery.data?.bannerRef);
  const avatarUrl = buildAvatarUrl(settingsQuery.data?.avatarRef);

  const headerRef = useCallback((el: HTMLElement | null) => {
    headerObserverRef.current?.disconnect();
    headerObserverRef.current = null;
    if (!el) return;
    const header = el;
    function updateHeight() {
      const next = `${header.getBoundingClientRect().height}px`;
      document.documentElement.style.setProperty("--app-header-height", next);
    }
    updateHeight();
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(header);
    headerObserverRef.current = observer;
  }, []);

  return (
    <header
      ref={headerRef}
      {...{ [APP_HEADER_HOOK]: "" }}
      className={`group fixed inset-x-0 top-0 bg-transparent${isBannerPage ? " overflow-hidden" : ""}`}
      style={{
        viewTransitionName: "app-header",
        zIndex: Z.chrome,
      }}
    >
      <nav className="mx-auto max-w-5xl px-3 pt-6 pb-4 sm:px-6 lg:px-3">
        {/* Mobile: back | centered wordmark | contextual right action (E155 / E133). */}
        <div className="relative flex items-center justify-between sm:hidden">
          <MobileBackButton profileHandle={profileHandle} pathname={pathname} />
          <Link
            to={watchTo}
            viewTransition={pageViewTransition}
            className="wordmark-shadow -translate-x-1/2 absolute left-1/2 font-display italic text-snow text-2xl leading-none tracking-tight"
          >
            baykuş
          </Link>
          <MobileHeaderAction pathname={pathname} />
        </div>

        {/* Desktop: wordmark | centered labeled navigation | profile. */}
        <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-4 sm:grid">
          <Link
            to={watchTo}
            viewTransition={pageViewTransition}
            className="wordmark-shadow justify-self-start font-display italic text-snow text-2xl tracking-tight leading-none"
          >
            baykuş
          </Link>
          <div
            className={`flex items-center justify-center gap-2 ${
              isBannerPage ? "pointer-events-none group-hover:pointer-events-auto" : ""
            }`}
          >
            {NAV_ITEMS.map((item, index) => (
              <Link
                key={item.key}
                to={item.browse ? watchTo : item.to}
                viewTransition={pageViewTransition}
                {...(item.to === "/calendar" ? { activeOptions: { exact: false as const } } : {})}
                aria-label={t(item.key)}
                title={t(item.key)}
                onClick={item.browse ? undefined : disarmPosterMorph}
                className={`flex h-11 items-center justify-center gap-2 rounded-full bg-transparent px-4 font-medium text-muted text-sm transition-[translate,border-color,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[translate] hover:text-snow [&.active]:text-yellow ${
                  item.activeClass
                }${item.browse && browseActive ? ` text-yellow ${FORCE_FILL}` : ""}${
                  isBannerPage
                    ? ` -translate-y-20 delay-0 group-hover:translate-y-0 ${NAV_REVEAL_DELAYS[index]}`
                    : ""
                }`}
              >
                <item.Icon size={16} strokeWidth={1.5} />
                <span>{t(item.key)}</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-self-end">
            <Link
              to="/user/$handle"
              params={{ handle: profileHandle }}
              viewTransition={pageViewTransition}
              aria-label={t("app.nav.profile")}
              title={t("app.nav.profile")}
              onClick={disarmPosterMorph}
              className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-void/70 text-muted transition-[translate,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[translate] hover:text-snow [&.active]:text-yellow ${ACTIVE_FILL}${
                isBannerPage
                  ? " pointer-events-none -translate-y-20 delay-0 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:delay-[120ms]"
                  : ""
              }`}
            >
              {avatarUrl ? (
                <MediaImage
                  src={avatarUrl}
                  alt=""
                  wrapperClassName="block h-full w-full"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User size={18} strokeWidth={1.5} />
              )}
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
});
