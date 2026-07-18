import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import { mockSeriesSummary, noop } from "../../../../.storybook/mocks.ts";
import { WatchNextRow } from "./WatchNextRow.tsx";

const meta = {
  title: "Molecules/WatchNextRow",
  component: WatchNextRow,
  decorators: [withAppProviders],
  args: {
    series: mockSeriesSummary,
    onQuickMark: noop,
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof WatchNextRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Marking: Story = { args: { marking: true } };
