import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockSeriesDetail } from "../../../test/mocks.ts";
import { CastRail } from "./CastRail.tsx";

describe("CastRail", () => {
  it("renders cast member names", () => {
    render(<CastRail cast={mockSeriesDetail.cast} />);
    expect(screen.getByText("Bryan Cranston")).toBeInTheDocument();
    expect(screen.getByText("Aaron Paul")).toBeInTheDocument();
    expect(screen.getByText("Walter White")).toBeInTheDocument();
    expect(screen.getByText("Jesse Pinkman")).toBeInTheDocument();
  });

  it("returns null when cast is empty", () => {
    const { container } = render(<CastRail cast={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
