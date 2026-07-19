import { useQuery } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  useParams,
} from "@tanstack/react-router";
import { getAuthSession } from "./api/client.ts";
import { Layout } from "./components/layout/Layout/Layout.tsx";
import { ProfileGuard } from "./components/layout/ProfileGuard/ProfileGuard.tsx";
import { selfHandleParam } from "./lib/profilePath.ts";
import {
  getScrollRestorationKey,
  installCalendarWatchScrollIsolation,
} from "./lib/scrollRestoration.ts";
import { installPosterMorphCleanup } from "./lib/posterTransition.ts";
import { ClaimPage } from "./pages/auth/ClaimPage.tsx";
import { LoginPage } from "./pages/auth/LoginPage.tsx";
import { CalendarPage } from "./pages/calendar/CalendarPage.tsx";
import { ImportPage } from "./pages/import/ImportPage.tsx";
import { LibraryPage } from "./pages/library/LibraryPage.tsx";
import { AllSeriesPage } from "./pages/profile/AllSeriesPage.tsx";
import { FavoritesPage } from "./pages/profile/FavoritesPage.tsx";
import { ProfilePage } from "./pages/profile/ProfilePage.tsx";
import { StatsPage } from "./pages/profile/stats/StatsPage.tsx";
import { SearchPage } from "./pages/search/SearchPage.tsx";
import { SeriesDetailPage } from "./pages/series/SeriesDetailPage.tsx";
import { SeriesPreviewPage } from "./pages/series/SeriesPreviewPage.tsx";
import { SettingsPage } from "./pages/settings/SettingsPage.tsx";
import { WatchHistoryPage } from "./pages/watch/WatchHistoryPage.tsx";
import { WatchPage } from "./pages/watch/WatchPage.tsx";

// Layout renders the nav chrome + auth guard for every route except
// /login and /claim, which it detects by pathname and renders bare
// (see components/Layout.tsx) — TanStack Router's code-based pathless
// layout routes fought the type generator, so this was the simpler,
// equally-correct alternative.
const rootRoute = createRootRoute({ component: Layout });

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LibraryPage,
});

const seriesDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/series/$id",
  component: SeriesDetailPage,
});

const seriesPreviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/series/new",
  component: SeriesPreviewPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    tmdbId?: number | undefined;
    tvmazeId?: number | undefined;
    imdbId?: string | undefined;
    tvdbId?: number | undefined;
  } => {
    return {
      tmdbId: search.tmdbId ? Number(search.tmdbId) : undefined,
      tvmazeId: search.tvmazeId ? Number(search.tvmazeId) : undefined,
      imdbId: search.imdbId ? String(search.imdbId) : undefined,
      tvdbId: search.tvdbId ? Number(search.tvdbId) : undefined,
    };
  },
});

const watchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/watch",
  component: WatchPage,
});

/** Spec 010 WP2: history split out of the WatchPage accordion into its own page. */
const watchHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/watch/history",
  component: WatchHistoryPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { order?: "newest" | "oldest" | undefined } => {
    return search.order === "oldest" ? { order: "oldest" } : {};
  },
});

/** E136: each calendar mode is its own URL (timeline default; month + schedule nested). */
function CalendarTimelinePage() {
  return <CalendarPage mode="timeline" />;
}
function CalendarMonthPage() {
  return <CalendarPage mode="month" />;
}
function CalendarSchedulePage() {
  return <CalendarPage mode="schedule" />;
}

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar",
  component: CalendarTimelinePage,
});

const calendarMonthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar/month",
  component: CalendarMonthPage,
});

const calendarScheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar/schedule",
  component: CalendarSchedulePage,
});

// E57: /stats is a legacy bookmark — replace-redirects into the profile's stats subpage.
function StatsRedirect() {
  const sessionQuery = useQuery({ queryKey: ["auth-session"], queryFn: getAuthSession });
  if (!sessionQuery.data) return null;
  return (
    <Navigate
      to="/user/$handle/stats"
      params={{ handle: selfHandleParam(sessionQuery.data) }}
      replace
    />
  );
}

const statsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stats",
  component: StatsRedirect,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/user/$handle",
  component: ProfilePage,
});

const allSeriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/user/$handle/all-series",
  component: AllSeriesPage,
});

function ProfileStatsRoute() {
  const { handle } = useParams({ from: "/user/$handle/stats" });
  return (
    <ProfileGuard handle={handle} to="/user/$handle/stats">
      {() => <StatsPage />}
    </ProfileGuard>
  );
}

const profileStatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/user/$handle/stats",
  component: ProfileStatsRoute,
});

const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/user/$handle/favorites",
  component: FavoritesPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: SearchPage,
  validateSearch: (search: Record<string, unknown>): { q?: string | undefined } => {
    const raw = search.q;
    if (typeof raw !== "string") return {};
    return raw.length > 0 ? { q: raw } : {};
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const claimRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/claim",
  component: ClaimPage,
});

const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/import",
  component: ImportPage,
});

const routeTree = rootRoute.addChildren([
  libraryRoute,
  seriesDetailRoute,
  seriesPreviewRoute,
  watchRoute,
  watchHistoryRoute,
  calendarRoute,
  calendarMonthRoute,
  calendarScheduleRoute,
  statsRoute,
  profileRoute,
  allSeriesRoute,
  profileStatsRoute,
  favoritesRoute,
  searchRoute,
  settingsRoute,
  loginRoute,
  claimRoute,
  importRoute,
]);

// E51: defaultViewTransition stays false. Page fades / morphs opt in via
// `pageViewTransition` on Link/navigate (and manual startViewTransition).
// Root fade killed in CSS; app-main owns the cross-fade. Firefox <139 → instant.
export const router = createRouter({
  routeTree,
  defaultViewTransition: false,
  scrollRestoration: true,
  getScrollRestorationKey,
});

installCalendarWatchScrollIsolation(router);
installPosterMorphCleanup(router);

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
