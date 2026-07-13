import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { Layout } from "./components/Layout.tsx";
import { CalendarPage } from "./pages/CalendarPage.tsx";
import { LibraryPage } from "./pages/LibraryPage.tsx";
import { SeriesDetailPage } from "./pages/SeriesDetailPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { StatsPage } from "./pages/StatsPage.tsx";

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

const routeTree = rootRoute.addChildren([
  libraryRoute,
  seriesDetailRoute,
  calendarRoute,
  statsRoute,
  settingsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
