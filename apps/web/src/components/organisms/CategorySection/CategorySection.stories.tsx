import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import { mockSeriesSummary, noop } from "../../../../.storybook/mocks.ts";
import { CategorySection } from "./CategorySection.tsx";

const meta = {
  title: "Organisms/CategorySection",
  component: CategorySection,
  decorators: [withAppProviders],
  args: {
    category: "watching",
    items: [
      mockSeriesSummary,
      { ...mockSeriesSummary, id: 2, title: "The Wire", category: "watching" },
    ],
    sort: "lastWatched",
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CategorySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
