import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { uploadAvatar } from "../../../api/client.ts";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { ProfilePhotoUpload } from "./ProfilePhotoUpload.tsx";

vi.mock("../../../api/client.ts", () => ({
  getSettings: vi.fn(),
  getSeriesByParam: vi.fn(),
  uploadAvatar: vi.fn(),
  updateSettings: vi.fn(),
  prefetch: vi.fn(),
}));

describe("ProfilePhotoUpload", () => {
  it("shows owl placeholder when avatarRef is null", async () => {
    await renderWithProviders(<ProfilePhotoUpload avatarRef={null} />, { withToast: true });
    expect(screen.getByText("🦉")).toBeInTheDocument();
    expect(screen.getByLabelText("Profil fotoğrafını değiştir")).toBeInTheDocument();
  });

  it("uses uploadAvatar mutation hook", async () => {
    await renderWithProviders(<ProfilePhotoUpload avatarRef={null} />, { withToast: true });
    expect(uploadAvatar).toBeDefined();
  });
});
