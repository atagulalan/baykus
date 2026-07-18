import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  mockEmptyStats,
  mockSparseStats,
  mockStats,
  mockStatsWithEmptySections,
} from "../../../../../../.storybook/mocks.ts";
import { hiddenWhenEmptyParameters } from "../../../../../../.storybook/storyHelpers.ts";
import { ActivityHeatmapSection } from "./ActivityHeatmapSection.tsx";

const meta = {
  title: "Stats/ActivityHeatmap/ActivityHeatmapSection",
  component: ActivityHeatmapSection,
  args: { stats: mockStats },
  parameters: { layout: "padded" },
} satisfies Meta<typeof ActivityHeatmapSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SparseActivity: Story = { args: { stats: mockSparseStats } };

/** Years exist but no daily activity — shows the in-section empty placeholder. */
export const EmptyActivity: Story = { args: { stats: mockStatsWithEmptySections } };

/** No years at all — section is omitted on `/stats` (returns null). */
export const HiddenWhenEmpty: Story = {
  args: { stats: mockEmptyStats },
  parameters: hiddenWhenEmptyParameters,
};
