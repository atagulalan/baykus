import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResetLibraryDialog } from "./ResetLibraryDialog.tsx";

describe("ResetLibraryDialog", () => {
  it("keeps confirm disabled until the checkbox is checked and phrase is typed", async () => {
    const user = userEvent.setup();
    render(
      <ResetLibraryDialog onConfirm={() => {}} onClose={() => {}} pending={false} error={false} />,
    );

    const confirmButton = screen.getByRole("button", { name: "Kalıcı olarak sil" });
    expect(confirmButton).toBeDisabled();

    await user.click(
      screen.getByRole("checkbox", {
        name: "Her şeyin kalıcı olarak silineceğini kabul ediyorum.",
      }),
    );
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByRole("textbox"), "HER SEYI SIL");
    expect(confirmButton).toBeEnabled();
  });

  it("calls onConfirm when requirements are met", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ResetLibraryDialog onConfirm={onConfirm} onClose={() => {}} pending={false} error={false} />,
    );

    await user.click(
      screen.getByRole("checkbox", {
        name: "Her şeyin kalıcı olarak silineceğini kabul ediyorum.",
      }),
    );
    await user.type(screen.getByRole("textbox"), "HER SEYI SIL");
    await user.click(screen.getByRole("button", { name: "Kalıcı olarak sil" }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
