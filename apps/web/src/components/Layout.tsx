import { useQuery } from "@tanstack/react-query";
import {
  Link,
  Navigate,
  Outlet,
  ScrollRestoration,
  useCanGoBack,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  GanttChart,
  LayoutGrid,
  List,
  Play,
  Search,
  Settings,
  User,
} from "lucide-react";
import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAuthSession, getSettings } from "../api/client.ts";
import { buildAvatarUrl } from "../api/images.ts";
import { backAffordance } from "../lib/backFallback.ts";
import { selfHandleParam } from "../lib/profilePath.ts";
import { readBrowsePath, updateUiPrefs } from "../lib/uiPrefs.ts";
import { Z } from "../lib/zIndex.ts";
import { MediaImage } from "./MediaImage.tsx";

/**
 * Instagram-style active treatment (spec 010 WP1): active tab = filled icon;
 * search has no natural filled form, so active = bolder stroke instead.
 * Targets the descendant `<svg>` directly — CSS beats lucide's `fill="none"`
 * presentation attribute, an inherited value from the `<a>` would not.
 */
const ACTIVE_FILL = "[&.active_svg]:fill-current";
const ACTIVE_BOLD = "[&.active_svg]:stroke-[2.5]";
/** Non-`.active`-class fallback for the browse (grid⇄list) forced-active case below. */
const FORCE_FILL = "[&_svg]:fill-current";
/** Dock-style reveal stagger; static classes keep Tailwind discovery deterministic. */
const NAV_REVEAL_DELAYS = [
  "group-hover:delay-[0ms]",
  "group-hover:delay-[40ms]",
  "group-hover:delay-[80ms]",
] as const;

/** E67 / E138: desktop + mobile tab bar. Library grid is a peer view of Watch (E142). */
const NAV_ITEMS = [
  {
    to: "/watch" as const,
    key: "app.nav.watch",
    Icon: Play,
    browse: true as const,
    activeClass: ACTIVE_FILL,
  },
  {
    to: "/calendar" as const,
    key: "app.nav.calendar",
    Icon: CalendarDays,
    browse: false as const,
    activeClass: ACTIVE_FILL,
  },
  {
    to: "/search" as const,
    key: "app.nav.search",
    Icon: Search,
    browse: false as const,
    activeClass: ACTIVE_BOLD,
  },
];

const BARE_PATHS = new Set(["/login", "/claim"]);

function isBrowsePath(pathname: string): boolean {
  return pathname === "/" || pathname === "/watch";
}

function isCalendarPath(pathname: string): boolean {
  return pathname === "/calendar" || pathname.startsWith("/calendar/");
}

const HEADER_ACTION_CLASS =
  "flex h-11 w-11 shrink-0 items-center justify-center text-muted transition-colors hover:text-snow";

/** Destination toggle: timeline ↔ schedule. Show the view the action opens. */
function CalendarModeToggle({
  pathname,
  className = HEADER_ACTION_CLASS,
}: {
  pathname: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const scheduleActive = pathname === "/calendar/schedule";
  const destination = scheduleActive ? "/calendar" : "/calendar/schedule";
  const label = t(scheduleActive ? "calendar.mode.timeline" : "calendar.mode.schedule");
  const Icon = scheduleActive ? List : GanttChart;

  return (
    <Link to={destination} aria-label={label} title={label} className={className}>
      <Icon size={20} strokeWidth={1.5} />
    </Link>
  );
}

/** Destination toggle: list (`/watch`) ↔ grid (`/`). Show the view the action opens. */
function BrowseViewToggle({ pathname }: { pathname: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const onLibrary = pathname === "/";

  if (onLibrary) {
    return (
      <button
        type="button"
        onClick={() => {
          updateUiPrefs({ browseView: "list" });
          void navigate({ to: "/watch" });
        }}
        aria-label={t("library.view.list")}
        title={t("library.view.list")}
        className={HEADER_ACTION_CLASS}
      >
        <List size={20} strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        updateUiPrefs({ browseView: "grid" });
        void navigate({ to: "/" });
      }}
      aria-label={t("library.view.grid")}
      title={t("library.view.grid")}
      className={HEADER_ACTION_CLASS}
    >
      <LayoutGrid size={20} strokeWidth={1.5} />
    </button>
  );
}

/**
 * Mobile header right slot — one fixed-size affordance that changes by route:
 * browse → destination view toggle; calendar → schedule toggle; profile → settings.
 * Empty spacer otherwise so the centered wordmark stays put.
 */
function MobileHeaderAction({ pathname }: { pathname: string }) {
  const { t } = useTranslation();

  if (isBrowsePath(pathname)) {
    return <BrowseViewToggle pathname={pathname} />;
  }
  if (isCalendarPath(pathname)) {
    return <CalendarModeToggle pathname={pathname} />;
  }
  if (isProfileHeroPath(pathname)) {
    return (
      <Link
        to="/settings"
        aria-label={t("app.nav.settings")}
        title={t("app.nav.settings")}
        className={HEADER_ACTION_CLASS}
      >
        <Settings size={20} strokeWidth={1.5} />
      </Link>
    );
  }
  return <div className="h-11 w-11 shrink-0" />;
}

/** Re-read browse path when the route changes (toggle persists + navigate). */
function useWatchBrowsePath(): "/" | "/watch" {
  useRouterState({ select: (s) => s.location.pathname });
  return readBrowsePath();
}

export function Layout() {
  const isBarePath = useRouterState({
    select: (s) => BARE_PATHS.has(s.location.pathname),
  });
  const sessionQuery = useQuery({ queryKey: ["auth-session"], queryFn: getAuthSession });

  if (isBarePath) {
    return (
      <>
        <ScrollRestoration />
        <Outlet />
      </>
    );
  }

  if (sessionQuery.isLoading) return null;
  if (sessionQuery.data && !sessionQuery.data.authenticated) return <Navigate to="/login" />;

  const profileHandle = sessionQuery.data ? selfHandleParam(sessionQuery.data) : "me";

  return (
    <div className="min-h-screen bg-void text-snow font-sans">
      <ScrollRestoration />
      <AppHeader profileHandle={profileHandle} />
      <MainShell>
        <Outlet />
      </MainShell>
      <AppTabBar profileHandle={profileHandle} />
    </div>
  );
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

function isPullToRefreshPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/watch" ||
    pathname === "/calendar" ||
    pathname.startsWith("/calendar/") ||
    pathname.endsWith("/all-series") ||
    pathname.endsWith("/favorites")
  );
}

/** E146: series detail hero starts at viewport top beneath the transparent header. */
function isSeriesHeroPath(pathname: string): boolean {
  return pathname.startsWith("/series/") && pathname !== "/series/new";
}

/** Profile banner uses the same under-header bleed as the series hero. */
function isProfileHeroPath(pathname: string): boolean {
  return /^\/user\/[^/]+$/.test(pathname);
}

function MainShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const heroBleed = isSeriesHeroPath(pathname) || isProfileHeroPath(pathname);
  const flushTop = isPullToRefreshPath(pathname);
  return (
    <main
      className={`mx-auto max-w-5xl pb-20 sm:pb-8 ${
        heroBleed ? "pt-0 -mt-[var(--app-header-height)]" : flushTop ? "pt-0 sm:pt-8" : "pt-8"
      }`}
    >
      {children}
    </main>
  );
}

const AppHeader = memo(function AppHeader({ profileHandle }: { profileHandle: string }) {
  const { t } = useTranslation();
  const headerObserverRef = useRef<ResizeObserver | null>(null);
  const [isStuck, setIsStuck] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const browseActive = isBrowsePath(pathname);
  /** Dock-hide only on banner/hero pages (series detail + profile hub). */
  const isBannerPage = isSeriesHeroPath(pathname) || isProfileHeroPath(pathname);
  const watchTo = useWatchBrowsePath();
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const avatarUrl = buildAvatarUrl(settingsQuery.data?.avatarRef);

  useEffect(() => {
    function updateStuckState() {
      setIsStuck(window.scrollY > 0);
    }

    updateStuckState();
    window.addEventListener("scroll", updateStuckState, { passive: true });
    return () => window.removeEventListener("scroll", updateStuckState);
  }, []);

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
      className={`group sticky top-0 transition-colors duration-200 ${
        isStuck
          ? "bg-void/95 backdrop-blur"
          : "bg-[linear-gradient(to_bottom,#000_0%,transparent_100%)]"
      }`}
      style={{ viewTransitionName: "app-header", zIndex: Z.chrome }}
    >
      <nav className="mx-auto max-w-5xl px-4 pt-6 pb-4">
        {/* Mobile: back | centered wordmark | contextual right action (E155 / E133). */}
        <div className="relative flex items-center justify-between sm:hidden">
          <MobileBackButton profileHandle={profileHandle} />
          {pathname === "/" ? (
            <span className="-translate-x-1/2 absolute left-1/2 font-display italic text-snow text-2xl leading-none tracking-tight">
              {t("app.nav.library")}
            </span>
          ) : (
            <Link
              to={watchTo}
              className="-translate-x-1/2 absolute left-1/2 font-display italic text-snow text-2xl leading-none tracking-tight"
            >
              baykuş
            </Link>
          )}
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

const AppTabBar = memo(function AppTabBar({ profileHandle }: { profileHandle: string }) {
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
