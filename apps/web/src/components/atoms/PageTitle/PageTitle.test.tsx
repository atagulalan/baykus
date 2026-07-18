import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageTitle } from "./PageTitle.tsx";

describe("PageTitle", () => {
  it("renders children in an h1", () => {
    render(<PageTitle>Library</PageTitle>);
    const heading = screen.getByRole("heading", { level: 1, name: "Library" });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass("font-display");
  });

  it("accepts rich children", () => {
    render(
      <PageTitle>
        <span>Stats</span>
      </PageTitle>,
    );
    expect(screen.getByText("Stats")).toBeInTheDocument();
  });
});
