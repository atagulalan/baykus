import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { getMockTimeData, ReleaseTime } from "./ReleaseTime.tsx";

describe("getMockTimeData", () => {
  it("derives stable local and origin times from itemId", () => {
    expect(getMockTimeData(1)).toEqual({ localTime: "13:00", originTime: "05:00 EST" });
    expect(getMockTimeData(2)).toEqual({ localTime: "02:00", originTime: "18:00 EST" });
  });

  it("pads hours to two digits", () => {
    const { localTime, originTime } = getMockTimeData(10);
    expect(localTime).toMatch(/^\d{2}:\d{2}$/);
    expect(originTime).toMatch(/^\d{2}:\d{2} EST$/);
  });
});

describe("ReleaseTime", () => {
  it("renders mock local and origin times for the item", () => {
    renderWithProviders(<ReleaseTime itemId={1} />);
    expect(screen.getByText("13:00")).toBeInTheDocument();
    expect(screen.getByText("(05:00 EST)")).toBeInTheDocument();
  });

  it("renders the air time label from i18n", () => {
    renderWithProviders(<ReleaseTime itemId={1} />);
    expect(screen.getByText("Saat")).toBeInTheDocument();
  });
});
