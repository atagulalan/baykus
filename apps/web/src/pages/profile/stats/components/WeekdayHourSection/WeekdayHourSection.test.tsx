import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats } from "../../../../../test/mocks.ts";
import { renderWithProviders } from "../../../../../test/renderWithProviders.tsx";
import { WeekdayHourSection } from "./WeekdayHourSection.tsx";

describe("WeekdayHourSection", () => {
  it("renders weekday and hour section headings", () => {
    renderWithProviders(
      <WeekdayHourSection stats={{ byWeekday: mockStats.byWeekday, byHour: mockStats.byHour }} />,
    );
    expect(screen.getByRole("heading", { name: "Haftanın Günü" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Günün Saati" })).toBeInTheDocument();
  });

  it("returns null when all weekday and hour counts are zero", () => {
    const zeroWeekday = Array.from({ length: 7 }, () => 0);
    const zeroHour = Array.from({ length: 24 }, () => 0);
    const { container } = renderWithProviders(
      <WeekdayHourSection stats={{ byWeekday: zeroWeekday, byHour: zeroHour }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
