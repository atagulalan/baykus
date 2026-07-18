import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DeleteAccountDialog } from "./DeleteAccountDialog.tsx";

describe("DeleteAccountDialog", () => {
  it("requires a password before confirming", () => {
    render(
      <DeleteAccountDialog onConfirm={() => {}} onClose={() => {}} pending={false} error={false} />,
    );
    expect(screen.getByRole("button", { name: "Yine de sil" })).toBeDisabled();
  });

  it("calls onConfirm with the entered password", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <DeleteAccountDialog
        onConfirm={onConfirm}
        onClose={() => {}}
        pending={false}
        error={false}
      />,
    );

    await user.type(screen.getByLabelText("Şifre"), "secret123");
    await user.click(screen.getByRole("button", { name: "Yine de sil" }));

    expect(onConfirm).toHaveBeenCalledWith("secret123");
  });

  it("shows an error message when error is true", () => {
    render(
      <DeleteAccountDialog onConfirm={() => {}} onClose={() => {}} pending={false} error={true} />,
    );
    expect(screen.getByText("Hesap silinemedi — şifreni kontrol et")).toBeInTheDocument();
  });
});
