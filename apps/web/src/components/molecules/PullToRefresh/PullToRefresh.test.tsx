import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PullToRefresh } from "./PullToRefresh.tsx";

describe("PullToRefresh", () => {
  it("renders children", () => {
    render(
      <PullToRefresh onRefresh={vi.fn().mockResolvedValue(undefined)}>
        <p>Page content</p>
      </PullToRefresh>,
    );
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });

  it("renders history variant indicator with label", () => {
    const { container } = render(
      <PullToRefresh variant="history" onOpen={vi.fn()}>
        <p>Library</p>
      </PullToRefresh>,
    );
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("Geçmişi göster")).toBeInTheDocument();
    const indicator = container.querySelector('[aria-hidden="true"]');
    expect(indicator?.querySelector("svg")).toBeTruthy();
  });
});
