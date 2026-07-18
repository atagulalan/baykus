import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import { mockCalendarDays } from "../../../../.storybook/mocks.ts";
import { MonthGrid } from "./MonthGrid.tsx";

const meta = {
  title: "Organisms/MonthGrid",
  component: MonthGrid,
  decorators: [withAppProviders],
  args: {
    year: 2026,
    month: 7,
    days: mockCalendarDays,
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof MonthGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EmptyMonth: Story = {
  args: { days: [] },
};
