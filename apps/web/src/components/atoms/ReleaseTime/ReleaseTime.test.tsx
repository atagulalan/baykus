import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { ReleaseTime } from "./ReleaseTime.tsx";

describe("ReleaseTime", () => {
  it("renders local and origin times from airStamp", () => {
    renderWithProviders(<ReleaseTime airStamp="2026-07-20T03:00:00Z" />);
    expect(screen.getByText("Saat")).toBeInTheDocument();
    expect(screen.getByText(/\(\d{2}:\d{2}/)).toBeInTheDocument();
  });
});
