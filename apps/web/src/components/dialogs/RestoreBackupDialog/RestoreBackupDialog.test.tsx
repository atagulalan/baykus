import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { RestoreBackupDialog } from "./RestoreBackupDialog.tsx";

vi.mock("../../../api/client.ts", () => ({
  importZip: vi.fn(),
  exportZipUrl: () => "/api/export",
}));

describe("RestoreBackupDialog", () => {
  it("renders import mode radios with merge selected by default", () => {
    renderWithProviders(<RestoreBackupDialog onClose={() => {}} />, { withToast: true });

    const mergeRadio = screen.getByRole("radio", { name: /Yedektekileri mevcut listeme ekle/i });
    const replaceRadio = screen.getByRole("radio", { name: /Eskileri sil, sadece yedeği kur/i });

    expect(mergeRadio).toBeChecked();
    expect(replaceRadio).not.toBeChecked();
  });

  it("switches to replace mode when selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RestoreBackupDialog onClose={() => {}} />, { withToast: true });

    await user.click(screen.getByRole("radio", { name: /Eskileri sil, sadece yedeği kur/i }));

    expect(screen.getByRole("radio", { name: /Eskileri sil, sadece yedeği kur/i })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /Yedektekileri mevcut listeme ekle/i }),
    ).not.toBeChecked();
  });

  it("keeps import disabled without a selected file", () => {
    renderWithProviders(<RestoreBackupDialog onClose={() => {}} />, { withToast: true });
    expect(screen.getByRole("button", { name: "Geri Yükle" })).toBeDisabled();
  });
});
