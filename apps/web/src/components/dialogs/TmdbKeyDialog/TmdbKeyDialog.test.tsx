import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TmdbKeyDialog } from "./TmdbKeyDialog.tsx";

describe("TmdbKeyDialog", () => {
  it("keeps save disabled without input", () => {
    render(
      <TmdbKeyDialog
        onClose={() => {}}
        onSave={() => {}}
        onClear={() => {}}
        pending={false}
        isSet={false}
      />,
    );
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeDisabled();
  });

  it("calls onSave when input is provided", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <TmdbKeyDialog
        onClose={() => {}}
        onSave={onSave}
        onClear={() => {}}
        pending={false}
        isSet={false}
      />,
    );

    await user.type(screen.getByPlaceholderText("Anahtarı buraya yapıştırın"), "my-api-key");
    await user.click(screen.getByRole("button", { name: "Kaydet" }));

    expect(onSave).toHaveBeenCalledWith("my-api-key");
  });

  it("shows the isSet badge when a key is already configured", () => {
    render(
      <TmdbKeyDialog
        onClose={() => {}}
        onSave={() => {}}
        onClear={() => {}}
        pending={false}
        isSet={true}
      />,
    );
    expect(screen.getByText("kayıtlı ✓")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kaldır" })).toBeInTheDocument();
  });
});
