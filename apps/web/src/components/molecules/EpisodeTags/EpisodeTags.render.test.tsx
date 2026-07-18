import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EpisodeTags } from "./EpisodeTags.tsx";

describe("EpisodeTags (render)", () => {
  it("renders finale tag for finale episode type", () => {
    render(
      <EpisodeTags s={5} e={16} airDate="2013-09-29" episodeType="finale" seasonName="Season 5" />,
    );
    expect(screen.getByText("FİNAL")).toBeInTheDocument();
  });

  it("renders premiere tag for season premiere", () => {
    render(
      <EpisodeTags s={1} e={1} airDate="2008-01-20" episodeType="standard" seasonName={null} />,
    );
    expect(screen.getByText("PREMIER")).toBeInTheDocument();
  });

  it("renders nothing for a plain old episode", () => {
    const { container } = render(
      <EpisodeTags s={2} e={5} airDate="2020-01-01" episodeType="standard" seasonName={null} />,
    );
    expect(container.textContent).toBe("");
  });
});
