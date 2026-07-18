import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import { PullToRefresh } from "./PullToRefresh.tsx";

const meta = {
  title: "Molecules/PullToRefresh",
  component: PullToRefresh,
  decorators: [withAppProviders],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PullToRefresh>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Refresh: Story = {
  args: {
    onRefresh: async () => {},
    children: (
      <div className="flex h-[120vh] items-start justify-center p-8 text-sm text-muted">
        Pull down from the top (touch only)
      </div>
    ),
  },
};

export const History: Story = {
  args: {
    variant: "history",
    onOpen: () => {},
    children: (
      <div className="flex h-[120vh] items-start justify-center p-8 text-sm text-muted">
        Pull down to open history (touch only)
      </div>
    ),
  },
};
