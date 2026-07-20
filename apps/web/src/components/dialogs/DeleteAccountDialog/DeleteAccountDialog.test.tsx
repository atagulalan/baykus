import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { OAuthProvider } from "../../../api/types.ts";
import { DeleteAccountDialog } from "./DeleteAccountDialog.tsx";

const passwordProps = {
  hasPassword: true,
  identities: [] as OAuthProvider[],
  oauthProviders: {},
};

describe("DeleteAccountDialog", () => {
  it("requires a password before confirming", () => {
    render(
      <DeleteAccountDialog
        onConfirm={() => {}}
        onClose={() => {}}
        pending={false}
        error={false}
        {...passwordProps}
      />,
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
        {...passwordProps}
      />,
    );

    await user.type(screen.getByLabelText("Şifre"), "secret123");
    await user.click(screen.getByRole("button", { name: "Yine de sil" }));

    expect(onConfirm).toHaveBeenCalledWith({ password: "secret123" });
  });

  it("shows an error message when error is true", () => {
    render(
      <DeleteAccountDialog
        onConfirm={() => {}}
        onClose={() => {}}
        pending={false}
        error={true}
        {...passwordProps}
      />,
    );
    expect(screen.getByText("Hesap silinemedi — şifreni kontrol et")).toBeInTheDocument();
  });

  it("shows OAuth re-auth when the account has no password", () => {
    render(
      <DeleteAccountDialog
        onConfirm={() => {}}
        onClose={() => {}}
        pending={false}
        error={false}
        hasPassword={false}
        identities={["google"]}
        oauthProviders={{ google: { clientId: "web-client" } }}
      />,
    );
    expect(screen.getByRole("button", { name: /Google/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Yine de sil" })).not.toBeInTheDocument();
  });
});
