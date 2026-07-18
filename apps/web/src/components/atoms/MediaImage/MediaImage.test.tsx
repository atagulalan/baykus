import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MediaImage } from "./MediaImage.tsx";

describe("MediaImage", () => {
  it("shows loading state until the image loads", () => {
    render(<MediaImage src="/img/test/poster.jpg" alt="Poster" />);
    expect(screen.getByRole("img", { hidden: true })).toHaveClass("opacity-0");
    expect(document.querySelector("[aria-busy='true']")).toBeInTheDocument();
  });

  it("reveals the image and calls onLoad after load event", () => {
    const onLoad = vi.fn();
    render(<MediaImage src="/img/test/poster.jpg" alt="Poster" onLoad={onLoad} />);
    const img = screen.getByRole("img", { hidden: true });
    fireEvent.load(img);
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(img).not.toHaveClass("opacity-0");
    expect(document.querySelector("[aria-busy='true']")).not.toBeInTheDocument();
  });

  it("unmounts and calls onError when the image fails", () => {
    const onError = vi.fn();
    const { container } = render(
      <MediaImage src="/img/test/missing.jpg" alt="Missing" onError={onError} />,
    );
    fireEvent.error(screen.getByRole("img", { hidden: true }));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(container.querySelector("img")).toBeNull();
  });
});
