import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
  it("renders children via render prop", async () => {
    await renderWithProviders(
      <ProfileBannerPicker bannerRef={null}>
        {(openPicker) => (
          <button type="button" onClick={openPicker}>
            Change banner
          </button>
        )}
      </ProfileBannerPicker>,
    );
    expect(screen.getByRole("button", { name: "Change banner" })).toBeInTheDocument();
  });

  it("uses a compact identity strip when no banner is set", async () => {
    const { container } = await renderWithProviders(
      <ProfileBannerPicker bannerRef={null}>{() => <span>identity</span>}</ProfileBannerPicker>,
    );
    const strip = container.querySelector("section > div.relative.z-10");
    expect(strip?.className).toContain("pt-[calc(var(--app-header-height)+0.75rem)]");
    expect(strip?.className).not.toContain("min-h-[24rem]");
  });

  it("keeps the tall banner shell when a banner is set", async () => {
    const { container } = await renderWithProviders(
      <ProfileBannerPicker bannerRef="tmdb:1396/backdrop.jpg">
        {() => <span>identity</span>}
      </ProfileBannerPicker>,
    );
    const strip = container.querySelector("section > div.relative.z-10");
    expect(strip?.className).toContain("min-h-[24rem]");
  });

  it("opens picker modal with howto and no backdrop grid", async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <ProfileBannerPicker bannerRef={null}>
        {(openPicker) => (
          <button type="button" onClick={openPicker}>
            Change banner
          </button>
        )}
      </ProfileBannerPicker>,
    );
    await user.click(screen.getByRole("button", { name: "Change banner" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Use as profile cover/i)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("shows Remove when a banner is set", async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <ProfileBannerPicker bannerRef="tmdb:1396/backdrop.jpg">
        {(openPicker) => (
          <button type="button" onClick={openPicker}>
            Change banner
          </button>
        )}
      </ProfileBannerPicker>,
    );
    await user.click(screen.getByRole("button", { name: "Change banner" }));
    const remove = screen.getByRole("button", { name: "Remove" });
    expect(remove).toBeInTheDocument();
    expect(remove.className).not.toMatch(/font-mono/);
  });
});
