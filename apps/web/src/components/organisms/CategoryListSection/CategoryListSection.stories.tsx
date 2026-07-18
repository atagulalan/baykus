import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import { mockSeriesSummary, noop } from "../../../../.storybook/mocks.ts";
import { CategoryListSection } from "./CategoryListSection.tsx";

const meta = {
  title: "Organisms/CategoryListSection",
  component: CategoryListSection,
  decorators: [withAppProviders],
  args: {
    category: "watching",
    items: [mockSeriesSummary, { ...mockSeriesSummary, id: 2, title: "Severance" }],
    sort: "lastWatched",
    isMarking: () => false,
    onQuickMark: noop,
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CategoryListSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
