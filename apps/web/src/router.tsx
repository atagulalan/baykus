import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { Layout } from "./components/Layout.tsx";
import { CalendarPage } from "./pages/CalendarPage.tsx";
import { ClaimPage } from "./pages/ClaimPage.tsx";
import { LibraryPage } from "./pages/LibraryPage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { SeriesDetailPage } from "./pages/SeriesDetailPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { StatsPage } from "./pages/StatsPage.tsx";

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

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar",
  component: CalendarPage,
});

const statsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stats",
  component: StatsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
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

const routeTree = rootRoute.addChildren([
  libraryRoute,
  seriesDetailRoute,
  calendarRoute,
  statsRoute,
  settingsRoute,
  loginRoute,
  claimRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
