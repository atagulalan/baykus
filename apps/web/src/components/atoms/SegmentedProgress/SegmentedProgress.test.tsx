import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SeasonProgress } from "../../../api/types.ts";
import { SegmentedProgress } from "./SegmentedProgress.tsx";

function sp(seasons: SeasonProgress["seasons"], sequential: boolean): SeasonProgress {
  return { seasons, sequential };
}

describe("SegmentedProgress (render)", () => {
  it("renders a plain percentage bar when progress is non-sequential", () => {
    const { container } = render(
      <SegmentedProgress
        seasonProgress={sp(
          [
            { number: 1, watched: 4, total: 8 },
            { number: 2, watched: 10, total: 10 },
          ],
          false,
        )}
        watched={14}
        aired={18}
      />,
    );
    const bar = container.querySelector("[style*='width: 78%']");
    expect(bar).toBeInTheDocument();
    expect(container.querySelectorAll(".flex-1.overflow-hidden").length).toBe(0);
  });

  it("renders season segments for sequential progress", () => {
    const { container } = render(
      <SegmentedProgress
        seasonProgress={sp(
          [
            { number: 1, watched: 8, total: 8 },
            { number: 2, watched: 3, total: 10 },
            { number: 3, watched: 0, total: 8 },
          ],
          true,
        )}
        watched={11}
        aired={26}
      />,
    );
    expect(container.querySelectorAll(".shrink-0").length).toBe(2);
    expect(container.querySelector("[style*='width: 30%']")).toBeInTheDocument();
  });

  it("applies category color class when category is set", () => {
    const { container } = render(
      <SegmentedProgress
        seasonProgress={sp([{ number: 1, watched: 2, total: 4 }], true)}
        watched={2}
        aired={4}
        category="watching"
      />,
    );
    expect(container.querySelector(".bg-yellow")).toBeInTheDocument();
  });
});
