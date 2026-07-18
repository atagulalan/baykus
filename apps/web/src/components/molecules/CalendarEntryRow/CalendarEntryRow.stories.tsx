import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import { mockCalendarEntry, mockLongTitle, noop } from "../../../../.storybook/mocks.ts";
import { CalendarEntryRow } from "./CalendarEntryRow.tsx";

const meta = {
  title: "Molecules/CalendarEntryRow",
  component: CalendarEntryRow,
  decorators: [withAppProviders],
  args: {
    entry: mockCalendarEntry,
    onToggleWatched: noop,
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof CalendarEntryRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Watched: Story = {
  args: { watched: true },
};

export const LongTitle: Story = {
  args: {
    entry: {
      ...mockCalendarEntry,
      title: mockLongTitle,
      episodeTitle: mockLongTitle,
    },
  },
};

export const WithoutToggle: Story = {
  render: () => <CalendarEntryRow entry={mockCalendarEntry} />,
};
