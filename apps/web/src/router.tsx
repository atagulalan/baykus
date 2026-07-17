import { useQuery } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  useParams,
} from "@tanstack/react-router";
import { getAuthSession } from "./api/client.ts";
import { Layout } from "./components/Layout.tsx";
import { ProfileGuard } from "./components/ProfileGuard.tsx";
import { selfHandleParam } from "./lib/profilePath.ts";
import { AllSeriesPage } from "./pages/AllSeriesPage.tsx";
import { CalendarPage } from "./pages/CalendarPage.tsx";
import { ClaimPage } from "./pages/ClaimPage.tsx";
import { FavoritesPage } from "./pages/FavoritesPage.tsx";
import { ImportPage } from "./pages/ImportPage.tsx";
import { LibraryPage } from "./pages/LibraryPage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { ProfilePage } from "./pages/ProfilePage.tsx";
import { SearchPage } from "./pages/SearchPage.tsx";
import { SeriesDetailPage } from "./pages/SeriesDetailPage.tsx";
import { SeriesPreviewPage } from "./pages/SeriesPreviewPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { StatsPage } from "./pages/StatsPage.tsx";
import { WatchPage } from "./pages/WatchPage.tsx";

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

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar",
  component: CalendarPage,
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
  calendarRoute,
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

// E51: subtle root cross-fade on every route change (CSS tunes duration in
// index.css); reduced-motion and unsupporting browsers (Firefox <139) both
// degrade to an instant navigation with no JS feature-detect needed.
export const router = createRouter({ routeTree, defaultViewTransition: true });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
