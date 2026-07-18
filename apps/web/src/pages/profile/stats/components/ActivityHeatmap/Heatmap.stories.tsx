import type { Meta, StoryObj } from "@storybook/react-vite";
import { mockStats } from "../../../../../../.storybook/mocks.ts";
import { Heatmap } from "./Heatmap.tsx";

const meta = {
  title: "Stats/ActivityHeatmap/Heatmap",
  component: Heatmap,
  args: {
    years: [2025, 2026],
    days: mockStats.activityByDay,
    tooltipFor: (date, count) => `${date}: ${count} episodes`,
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof Heatmap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
