import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import { mockCalendarDays, noop } from "../../../../.storybook/mocks.ts";
import { ScheduleGrid } from "./ScheduleGrid.tsx";

const meta = {
  title: "Organisms/ScheduleGrid",
  component: ScheduleGrid,
  decorators: [withAppProviders],
  args: {
    days: mockCalendarDays,
    autoScrollToCurrentWeek: true,
    onVisibleWeekChange: noop,
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ScheduleGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPagination: Story = {
  args: {
    hasNextPageLeft: true,
    hasNextPageRight: true,
    onLoadMoreLeft: noop,
    onLoadMoreRight: noop,
  },
};

export const AtBoundaries: Story = {
  args: {
    hasNextPageLeft: false,
    hasNextPageRight: false,
  },
};
