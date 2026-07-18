import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { type RenderOptions, render, waitFor } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { I18nextProvider } from "react-i18next";
import type { AuthSession, Settings } from "../api/types.ts";
import i18n from "../i18n/index.ts";
import { ToastProvider } from "../lib/toast.tsx";
import { testSettings } from "./fixtures.ts";
import { mockAuthSession, mockSeriesDetail } from "./mocks.ts";

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  settings?: Partial<Settings>;
  authSession?: Partial<AuthSession>;
  withRouter?: boolean;
  withToast?: boolean;
  seriesParam?: string;
}

function createTestQueryClient(
  options: {
    settings?: Partial<Settings>;
    authSession?: Partial<AuthSession>;
    seriesParam?: string;
  } = {},
): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  client.setQueryData(["settings"], { ...testSettings, ...options.settings });
  client.setQueryData(["auth-session"], { ...mockAuthSession, ...options.authSession });
  if (options.seriesParam) {
    client.setQueryData(["series", options.seriesParam], mockSeriesDetail);
  }
  return client;
}

function TestRouter({ children }: { children: ReactNode }) {
  const childRef = useRef<ReactNode>(children);
  childRef.current = children;

  const [router] = useState(() => {
    const rootRoute = createRootRoute({
      component: () => <Outlet />,
    });

    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => <>{childRef.current}</>,
    });

    const seriesRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/series/$id",
      component: () => <div />,
    });

    return createRouter({
      routeTree: rootRoute.addChildren([indexRoute, seriesRoute]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
      defaultPendingMinMs: 0,
    });
  });

  useEffect(() => {
    void router.load();
  }, [router]);

  return <RouterProvider router={router} />;
}

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const {
    settings,
    authSession,
    seriesParam,
    withRouter = false,
    withToast = false,
    ...renderOptions
  } = options;
  const queryClient = createTestQueryClient({
    ...(settings !== undefined ? { settings } : {}),
    ...(authSession !== undefined ? { authSession } : {}),
    ...(seriesParam !== undefined ? { seriesParam } : {}),
  });

  function Wrapper({ children }: { children: ReactNode }) {
    const inner = withRouter ? <TestRouter>{children}</TestRouter> : children;
    const withProviders = withToast ? <ToastProvider>{inner}</ToastProvider> : inner;

    return (
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>{withProviders}</I18nextProvider>
      </QueryClientProvider>
    );
  }

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/** Router shell that waits until the story content is mounted. */
export async function renderWithRouter(
  ui: ReactElement,
  options: Omit<RenderWithProvidersOptions, "withRouter"> = {},
) {
  const result = renderWithProviders(ui, { ...options, withRouter: true });
  await waitFor(() => {
    if (!result.container.textContent?.trim()) {
      throw new Error("Router content not mounted");
    }
  });
  return result;
}
