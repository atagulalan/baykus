import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SeasonProgress, SeasonProgressEntry } from "../../../api/types.ts";
import { SegmentedProgress } from "./SegmentedProgress.tsx";

function entry(
  partial: Omit<SeasonProgressEntry, "announced"> & { announced?: number },
): SeasonProgressEntry {
  return { announced: partial.announced ?? partial.total, ...partial };
}

function sp(
  seasons: Array<Omit<SeasonProgressEntry, "announced"> & { announced?: number }>,
  sequential: boolean,
): SeasonProgress {
  return { seasons: seasons.map(entry), sequential };
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

  it("uses a green donut bead for seasons with unaired remaining (E185)", () => {
    const { container } = render(
      <SegmentedProgress
        seasonProgress={sp(
          [
            { number: 1, watched: 8, total: 8, announced: 8 },
            { number: 2, watched: 10, total: 10, announced: 10 },
            { number: 3, watched: 6, total: 6, announced: 6 },
            { number: 4, watched: 4, total: 4, announced: 13 },
          ],
          true,
        )}
        watched={28}
        aired={28}
        category="up_to_date"
      />,
    );
    const beads = container.querySelectorAll(".shrink-0");
    expect(beads).toHaveLength(4);
    expect(beads[0]).toHaveClass("bg-green-500");
    expect(beads[1]).toHaveClass("bg-green-500");
    expect(beads[2]).toHaveClass("bg-green-500");
    expect(beads[3]).toHaveClass("border-green-500");
    expect(beads[3]).not.toHaveClass("bg-green-500");
  });

  it("keeps a fully-finished single season solid green even when up_to_date (no unaired)", () => {
    const { container } = render(
      <SegmentedProgress
        seasonProgress={sp([{ number: 1, watched: 9, total: 9, announced: 9 }], true)}
        watched={9}
        aired={9}
        category="up_to_date"
      />,
    );
    const bead = container.querySelector(".shrink-0");
    expect(bead).toHaveClass("bg-green-500");
    expect(bead).not.toHaveClass("border-green-500");
  });

  it("Mushoku-style mid-cour catch-up: finished solid green, current donut", () => {
    const { container } = render(
      <SegmentedProgress
        seasonProgress={sp(
          [
            { number: 1, watched: 23, total: 23, announced: 23 },
            { number: 2, watched: 24, total: 24, announced: 24 },
            { number: 3, watched: 4, total: 4, announced: 14 },
          ],
          true,
        )}
        watched={51}
        aired={51}
        category="up_to_date"
      />,
    );
    const beads = container.querySelectorAll(".shrink-0");
    expect(beads).toHaveLength(3);
    expect(beads[0]).toHaveClass("bg-green-500");
    expect(beads[1]).toHaveClass("bg-green-500");
    expect(beads[2]).toHaveClass("border-green-500");
    expect(beads[2]).not.toHaveClass("bg-green-500");
  });
});
