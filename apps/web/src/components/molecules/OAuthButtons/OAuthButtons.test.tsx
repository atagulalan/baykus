import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { OAuthButtons } from "./OAuthButtons.tsx";

vi.mock("../../../lib/oauth.ts", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/oauth.ts")>(
    "../../../lib/oauth.ts",
  );
  return {
    ...actual,
    beginGoogleSignIn: vi.fn(),
    hasPendingGoogleIdToken: vi.fn(() => false),
    takePendingGoogleIdToken: vi.fn(() => null),
    obtainIdToken: vi.fn(),
  };
});

describe("OAuthButtons", () => {
  it("renders nothing when no providers are configured", () => {
    const { container } = renderWithProviders(
      <OAuthButtons
        providers={{}}
        callback={vi.fn()}
        onAuthenticated={vi.fn()}
        onNeedsHandle={vi.fn()}
      />,
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("renders Google and Apple buttons when both are configured", () => {
    renderWithProviders(
      <OAuthButtons
        providers={{
          google: { clientId: "g" },
          apple: { clientId: "a" },
        }}
        callback={vi.fn()}
        onAuthenticated={vi.fn()}
        onNeedsHandle={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Apple/i })).toBeInTheDocument();
  });
});
