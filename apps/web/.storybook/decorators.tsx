import type { Decorator } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { type ComponentType, useEffect, useState } from "react";
import type { AuthSession, Settings } from "../src/api/types.ts";
import i18n from "../src/i18n/index.ts";
import { ToastProvider } from "../src/lib/toast.tsx";
import { countdownIn5Seconds, mockAuthSession, mockSeriesDetail, mockSettings } from "./mocks.ts";

let StoryComponent: ComponentType = () => null;

const rootRoute = createRootRoute({
  component: () => (
    <div className="w-full max-w-4xl">
      <Outlet />
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <StoryComponent />,
});

const seriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/series/$id",
  component: () => (
    <div className="p-4 font-mono text-xs text-muted">Series detail route placeholder</div>
  ),
});

const watchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/watch",
  component: () => <div className="p-4 font-mono text-xs text-muted">Watch route placeholder</div>,
});

const routeTree = rootRoute.addChildren([indexRoute, seriesRoute, watchRoute]);

function StoryRouterProvider() {
  const [router] = useState(() =>
    createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/"] }),
      defaultPendingMinMs: 0,
    }),
  );

  useEffect(() => {
    void router.load();
  }, [router]);

  return <RouterProvider router={router} />;
}

export interface StoryQueryClientOptions {
  settings?: Partial<Settings>;
  authSession?: Partial<AuthSession>;
}

export function createStoryQueryClient(options: StoryQueryClientOptions = {}): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
  client.setQueryData(["settings"], { ...mockSettings, ...options.settings });
  client.setQueryData(["auth-session"], { ...mockAuthSession, ...options.authSession });
  client.setQueryData(["series", "i1"], mockSeriesDetail);
  return client;
}

/** TanStack Router shell for components using Link. */
export const withRouter: Decorator = (Story) => {
  StoryComponent = Story;
  return <StoryRouterProvider />;
};

/** React Query for settings/auth-aware components. */
export const withQueryClient: Decorator = (Story, context) => {
  const settings = context.parameters.querySettings as Partial<Settings> | undefined;
  const authSession = context.parameters.authSession as Partial<AuthSession> | undefined;
  const queryClient = createStoryQueryClient({
    ...(settings ? { settings } : {}),
    ...(authSession ? { authSession } : {}),
  });
  return (
    <QueryClientProvider client={queryClient}>
      <Story />
    </QueryClientProvider>
  );
};

/** Router + Query + toast — use for SeriesCard, EpisodeRow, profile uploads, etc. */
export const withAppProviders: Decorator = (Story, context) => {
  StoryComponent = Story;
  const settings = context.parameters.querySettings as Partial<Settings> | undefined;
  const authSession = context.parameters.authSession as Partial<AuthSession> | undefined;
  const queryClient = createStoryQueryClient({
    ...(settings ? { settings } : {}),
    ...(authSession ? { authSession } : {}),
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <StoryRouterProvider />
      </ToastProvider>
    </QueryClientProvider>
  );
};

/** Switch i18n locale via Storybook toolbar (`globals.locale`). */
export const withLocaleToolbar: Decorator = (Story, context) => {
  const locale = (context.globals.locale as "tr" | "en" | "ja" | undefined) ?? "tr";

  function LocaleShell({ activeLocale }: { activeLocale: "tr" | "en" | "ja" }) {
    useEffect(() => {
      void i18n.changeLanguage(activeLocale);
    }, [activeLocale]);
    return <Story />;
  }

  return <LocaleShell activeLocale={locale} />;
};

/** Pin a specific locale regardless of toolbar. */
export function withLocale(locale: "tr" | "en" | "ja"): Decorator {
  return (Story) => {
    function LocaleShell({ activeLocale }: { activeLocale: "tr" | "en" | "ja" }) {
      useEffect(() => {
        void i18n.changeLanguage(activeLocale);
      }, [activeLocale]);
      return <Story />;
    }

    return <LocaleShell activeLocale={locale} />;
  };
}

/** Pin "now" and set airDate/airStamp to now + 5s for countdown-second stories. */
export function withCountdownIn5Seconds(
  mapArgs?: (
    fixture: ReturnType<typeof countdownIn5Seconds>,
    args: Record<string, unknown>,
  ) => Record<string, unknown>,
): Decorator {
  return (Story, context) => {
    const fixture = countdownIn5Seconds();
    const storyArgs = mapArgs
      ? mapArgs(fixture, context.args as Record<string, unknown>)
      : {
          ...(context.args as Record<string, unknown>),
          airDate: fixture.airDate,
          airStamp: fixture.airStamp,
        };

    function CountdownShell() {
      useEffect(() => {
        const fixedMs = Date.parse(fixture.nowIso);
        const RealDate = globalThis.Date;
        class MockDate extends RealDate {
          constructor(...params: ConstructorParameters<typeof Date>) {
            if (params.length === 0) {
              super(fixedMs);
            } else {
              super(...params);
            }
          }
          static now() {
            return fixedMs;
          }
        }
        globalThis.Date = MockDate as typeof Date;
        return () => {
          globalThis.Date = RealDate;
        };
      }, []);
      return <Story args={storyArgs} />;
    }

    return <CountdownShell />;
  };
}

/** Pin Date/Date.now so airStamp countdown stories stay stable in Storybook. */
export function withFixedNow(iso: string): Decorator {
  return (Story) => {
    function FixedNowShell() {
      useEffect(() => {
        const fixedMs = Date.parse(iso);
        const RealDate = globalThis.Date;
        class MockDate extends RealDate {
          constructor(...params: ConstructorParameters<typeof Date>) {
            if (params.length === 0) {
              super(fixedMs);
            } else {
              super(...params);
            }
          }
          static now() {
            return fixedMs;
          }
        }
        globalThis.Date = MockDate as typeof Date;
        return () => {
          globalThis.Date = RealDate;
        };
      }, []);
      return <Story />;
    }
    return <FixedNowShell />;
  };
}

/** Seed auth session query data (multi-mode chrome). */
export function withAuthSession(session: AuthSession = mockAuthSession): Decorator {
  return (Story) => {
    const queryClient = createStoryQueryClient({ authSession: session });
    return (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    );
  };
}
