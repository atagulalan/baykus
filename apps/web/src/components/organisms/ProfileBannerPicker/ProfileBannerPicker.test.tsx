import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { mockSeriesSummary } from "../../../test/mocks.ts";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { ProfileBannerPicker } from "./ProfileBannerPicker.tsx";

vi.mock("../../../api/client.ts", () => ({
  getSettings: vi.fn(),
  getSeriesByParam: vi.fn(),
  uploadAvatar: vi.fn(),
  updateSettings: vi.fn(),
  prefetch: vi.fn(),
}));

describe("ProfileBannerPicker", () => {
  const candidate = { ...mockSeriesSummary, backdropRef: "tmdb:1396/backdrop.jpg" };

  it("renders children via render prop", async () => {
    await renderWithProviders(
      <ProfileBannerPicker bannerRef={null} candidates={[candidate]}>
        {(openPicker) => (
          <button type="button" onClick={openPicker}>
            Change banner
          </button>
        )}
      </ProfileBannerPicker>,
    );
    expect(screen.getByRole("button", { name: "Change banner" })).toBeInTheDocument();
  });

  it("opens picker modal when openPicker is invoked", async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <ProfileBannerPicker bannerRef={null} candidates={[candidate]}>
        {(openPicker) => (
          <button type="button" onClick={openPicker}>
            Change banner
          </button>
        )}
      </ProfileBannerPicker>,
    );
    await user.click(screen.getByRole("button", { name: "Change banner" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByAltText("Breaking Bad")).toBeInTheDocument();
  });
});
