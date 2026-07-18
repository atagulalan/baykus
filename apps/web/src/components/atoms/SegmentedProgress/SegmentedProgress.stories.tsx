import type { Meta, StoryObj } from "@storybook/react-vite";
import { mockSeriesSummary } from "../../../../.storybook/mocks.ts";
import { SegmentedProgress } from "./SegmentedProgress.tsx";

const meta = {
  title: "Atoms/SegmentedProgress",
  component: SegmentedProgress,
  args: {
    seasonProgress: mockSeriesSummary.seasonProgress,
    watched: mockSeriesSummary.progress.watched,
    aired: mockSeriesSummary.progress.aired,
    category: "watching",
    size: "md",
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof SegmentedProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: "sm" } };

export const PlainFallback: Story = {
  args: {
    seasonProgress: { seasons: [], sequential: false },
    watched: 10,
    aired: 20,
  },
};
