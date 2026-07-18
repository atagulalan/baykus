import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { EpisodeLabel } from "./EpisodeLabel.tsx";

describe("EpisodeLabel", () => {
  it("renders SxEy format", () => {
    renderWithProviders(<EpisodeLabel s={3} e={5} format="SxEy" />);
    expect(screen.getByText("S3E5")).toBeInTheDocument();
  });

  it("renders zero-padded format", () => {
    renderWithProviders(<EpisodeLabel s={1} e={6} format="S01E06" />);
    expect(screen.getByText("S01E06")).toBeInTheDocument();
  });

  it("renders compact format", () => {
    renderWithProviders(<EpisodeLabel s={12} e={3} format="compact" />);
    expect(screen.getByText("12×3")).toBeInTheDocument();
  });
});
