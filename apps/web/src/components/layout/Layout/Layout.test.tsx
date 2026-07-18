/**
 * Layout shell tests with mocked TanStack Router hooks and API client.
 *
 * Limitations (not covered here — needs browser/e2e):
 * - MobileBackButton history.back vs fallback navigate
 * - Banner-page dock-hide hover reveal on series/profile hero routes
 * - Scroll-driven header gradient and ResizeObserver height sync
 * - BrowseViewToggle navigate + uiPrefs persistence
 */
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthSession, getSettings } from "../../../api/client.ts";
import { testSettings } from "../../../test/fixtures.ts";
import { mockAuthSession, mockAuthSessionGuest } from "../../../test/mocks.ts";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { Layout } from "./Layout.tsx";

const { mockPathname, mockNavigate } = vi.hoisted(() => ({
  mockPathname: { value: "/watch" },
  mockNavigate: vi.fn(),
}));

vi.mock("../../../api/client.ts", () => ({
  getAuthSession: vi.fn(),
  getSettings: vi.fn(),
}));

vi.mock("../../../pages/browse/BrowsePage.tsx", () => ({
  BrowsePage: () => <div data-testid="browse-page" />,
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet" />,
    ScrollRestoration: () => null,
    Link: ({
      children,
      to,
      "aria-label": ariaLabel,
      title,
    }: {
      children?: ReactNode;
      to: string;
      "aria-label"?: string;
      title?: string;
    }) => (
      <a href={to} aria-label={ariaLabel} title={title}>
        {children}
      </a>
    ),
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
    useRouterState: ({
      select,
    }: {
      select: (state: { location: { pathname: string } }) => unknown;
    }) => select({ location: { pathname: mockPathname.value } }),
    useNavigate: () => mockNavigate,
    useCanGoBack: () => false,
  };
});

describe("Layout", () => {
  beforeEach(() => {
    mockPathname.value = "/watch";
    mockNavigate.mockClear();
    vi.mocked(getAuthSession).mockResolvedValue(mockAuthSession);
    vi.mocked(getSettings).mockResolvedValue(testSettings);
    vi.stubGlobal(
      "ResizeObserver",
      vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      })),
    );
  });

  it("renders outlet without header on bare /login path", () => {
    mockPathname.value = "/login";

    renderWithProviders(<Layout />, { authSession: mockAuthSession });

    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "İzleme" })).not.toBeInTheDocument();
  });

  it("renders browse shell with nav when authenticated on /watch", () => {
    mockPathname.value = "/watch";

    renderWithProviders(<Layout />, { authSession: mockAuthSession });

    expect(screen.getByTestId("browse-page")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "İzleme" }).length).toBeGreaterThan(0);
  });

  it("redirects unauthenticated users to login", () => {
    mockPathname.value = "/watch";
    vi.mocked(getAuthSession).mockResolvedValue(mockAuthSessionGuest);

    renderWithProviders(<Layout />, { authSession: mockAuthSessionGuest });

    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/login");
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
  });
});
