import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthSession } from "../../../api/client.ts";
import { mockAuthSession } from "../../../test/mocks.ts";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { ProfileGuard } from "./ProfileGuard.tsx";

const navigateProps = vi.fn();

vi.mock("../../../api/client.ts", () => ({
  getAuthSession: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Navigate: (props: Record<string, unknown>) => {
      navigateProps(props);
      return <div data-testid="navigate" />;
    },
  };
});

describe("ProfileGuard", () => {
  beforeEach(() => {
    vi.mocked(getAuthSession).mockResolvedValue(mockAuthSession);
    navigateProps.mockClear();
  });

  it("renders children for own handle in multi mode", () => {
    renderWithProviders(
      <ProfileGuard handle="xava" to="/user/$handle">
        {(session) => <div data-testid="profile-content">{session.handle}</div>}
      </ProfileGuard>,
      { authSession: mockAuthSession },
    );

    expect(screen.getByTestId("profile-content")).toHaveTextContent("xava");
  });

  it("shows not-found for foreign handle", () => {
    renderWithProviders(
      <ProfileGuard handle="other" to="/user/$handle">
        {() => <div data-testid="profile-content" />}
      </ProfileGuard>,
      { authSession: mockAuthSession },
    );

    expect(screen.getByText("Profil bulunamadı.")).toBeInTheDocument();
    expect(screen.queryByTestId("profile-content")).not.toBeInTheDocument();
  });

  it('redirects "me" to canonical handle', () => {
    renderWithProviders(
      <ProfileGuard handle="me" to="/user/$handle">
        {() => <div data-testid="profile-content" />}
      </ProfileGuard>,
      { authSession: mockAuthSession },
    );

    expect(screen.getByTestId("navigate")).toBeInTheDocument();
    expect(navigateProps).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/user/$handle",
        params: { handle: "xava" },
        replace: true,
      }),
    );
    expect(screen.queryByTestId("profile-content")).not.toBeInTheDocument();
  });
});
