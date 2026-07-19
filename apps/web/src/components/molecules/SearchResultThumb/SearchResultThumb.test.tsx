import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockSearchResult } from "../../../test/mocks.ts";
import { SearchResultThumb } from "./SearchResultThumb.tsx";

describe("SearchResultThumb", () => {
  it("shows fallback icon when poster ref is missing", () => {
    const { container } = render(<SearchResultThumb result={mockSearchResult} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders MediaImage when a poster ref is available", () => {
    const result = { ...mockSearchResult, posterRef: "tmdb:/path/to/poster.jpg" };
    const { container } = render(<SearchResultThumb result={result} />);
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("falls back to icon after image error", () => {
    const result = { ...mockSearchResult, posterRef: "tmdb:/path/to/poster.jpg" };
    const { container } = render(<SearchResultThumb result={result} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    fireEvent.error(img!);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
