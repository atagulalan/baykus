import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockSeriesDetail } from "../../../test/mocks.ts";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { SeriesDetailsSheet } from "./SeriesDetailsSheet.tsx";

vi.mock("../../../api/client.ts", () => ({
  getSettings: vi.fn(),
  getSeriesByParam: vi.fn(),
  uploadAvatar: vi.fn(),
  updateSettings: vi.fn(),
  prefetch: vi.fn(),
}));

describe("SeriesDetailsSheet", () => {
  it("renders detail fields when open", async () => {
    await renderWithProviders(
      <SeriesDetailsSheet
        isOpen
        onClose={vi.fn()}
        detail={mockSeriesDetail}
        activeRegion="US"
        onRateChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/All bad things must come to an end/)).toBeInTheDocument();
    expect(
      screen.getByText(/A high school chemistry teacher diagnosed with inoperable lung cancer/),
    ).toBeInTheDocument();
    expect(screen.getByText("Dram")).toBeInTheDocument();
    expect(screen.getByText("drugs")).toBeInTheDocument();
    expect(screen.getByText("Bryan Cranston")).toBeInTheDocument();
    expect(screen.getByText("Netflix (US)")).toBeInTheDocument();
  });

  it("does not render content when closed", async () => {
    await renderWithProviders(
      <SeriesDetailsSheet
        isOpen={false}
        onClose={vi.fn()}
        detail={mockSeriesDetail}
        activeRegion="US"
        onRateChange={vi.fn()}
      />,
    );
    expect(screen.queryByText("Bryan Cranston")).not.toBeInTheDocument();
  });
});
