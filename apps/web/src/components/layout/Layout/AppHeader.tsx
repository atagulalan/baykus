import { useQuery } from "@tanstack/react-query";
import { Link, useCanGoBack, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, User } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSettings } from "../../../api/client.ts";
import { buildAvatarUrl } from "../../../api/images.ts";
import { backAffordance } from "../../../lib/backFallback.ts";
import { Z } from "../../../lib/zIndex.ts";
import { MediaImage } from "../../atoms/MediaImage/MediaImage.tsx";
import {
  ACTIVE_FILL,
  FORCE_FILL,
  isBrowsePath,
  isCalendarPath,
  isProfileHeroPath,
  isSeriesHeroPath,
  NAV_ITEMS,
  NAV_REVEAL_DELAYS,
  useWatchBrowsePath,
} from "./layoutShared.ts";
import { CalendarModeToggle, MobileHeaderAction } from "./LayoutToggles.tsx";

/** Header bg ramps from top fade to scrolled gradient over this scroll distance. */
const HEADER_SCROLL_FADE_PX = 100;

function headerScrollGradient(scrollY: number): string {
  const t = Math.min(Math.max(scrollY / HEADER_SCROLL_FADE_PX, 0), 1);
  if (t === 0) return "linear-gradient(to bottom, #000 0%, transparent 100%)";
  const midAlpha = 0.45 * t;
  const midStop = 100 - 35 * t;
  return `linear-gradient(to bottom, #000 0%, rgb(0 0 0 / ${midAlpha}) ${midStop}%, transparent 100%)`;
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

export const AppHeader = memo(function AppHeader({ profileHandle }: { profileHandle: string }) {
  const { t } = useTranslation();
  const headerObserverRef = useRef<ResizeObserver | null>(null);
  const [headerScrollY, setHeaderScrollY] = useState(0);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const browseActive = isBrowsePath(pathname);
  /** Dock-hide only on banner/hero pages (series detail + profile hub). */
  const isBannerPage = isSeriesHeroPath(pathname) || isProfileHeroPath(pathname);
  const watchTo = useWatchBrowsePath();
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const avatarUrl = buildAvatarUrl(settingsQuery.data?.avatarRef);

  useEffect(() => {
    function updateHeaderScroll() {
      setHeaderScrollY(window.scrollY);
    }

    updateHeaderScroll();
    window.addEventListener("scroll", updateHeaderScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateHeaderScroll);
  }, [pathname]);

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
      className="group sticky top-0"
      style={{
        viewTransitionName: "app-header",
        zIndex: Z.chrome,
        backgroundImage: headerScrollGradient(headerScrollY),
      }}
    >
      <nav className="mx-auto max-w-5xl px-4 pt-6 pb-4">
        {/* Mobile: back | centered wordmark | contextual right action (E155 / E133). */}
        <div className="relative flex items-center justify-between sm:hidden">
          <MobileBackButton profileHandle={profileHandle} />
          <Link
            to={watchTo}
            className="-translate-x-1/2 absolute left-1/2 font-display italic text-snow text-2xl leading-none tracking-tight"
          >
            baykuş
          </Link>
          <MobileHeaderAction pathname={pathname} />
        </div>

        {/* Desktop: wordmark | centered labeled navigation | profile. */}
        <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-4 sm:grid">
          <Link
            to={watchTo}
            className="justify-self-start font-display italic text-snow text-2xl tracking-tight leading-none"
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
                {...(item.to === "/calendar" ? { activeOptions: { exact: false as const } } : {})}
                aria-label={t(item.key)}
                title={t(item.key)}
                className={`flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-void/70 px-4 font-medium text-muted text-sm shadow-lg backdrop-blur-md transition-[transform,border-color,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform hover:border-white/20 hover:text-snow [&.active]:text-yellow ${
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
            {isCalendarPath(pathname) && <CalendarModeToggle pathname={pathname} />}
            <Link
              to="/user/$handle"
              params={{ handle: profileHandle }}
              aria-label={t("app.nav.profile")}
              title={t("app.nav.profile")}
              className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-void/70 text-muted transition-[transform,border-color,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform hover:border-white/20 hover:text-snow [&.active]:text-yellow ${ACTIVE_FILL}${
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
