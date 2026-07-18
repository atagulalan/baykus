import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import { mockSeriesSummary } from "../../../../.storybook/mocks.ts";
import { SeriesCard } from "./SeriesCard.tsx";

const meta = {
  title: "Molecules/SeriesCard",
  component: SeriesCard,
  decorators: [withAppProviders],
  args: { series: mockSeriesSummary },
  parameters: { layout: "padded" },
} satisfies Meta<typeof SeriesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoRating: Story = {
  args: { series: { ...mockSeriesSummary, rating: null } },
};

export const Finished: Story = {
  args: {
    series: {
      ...mockSeriesSummary,
      category: "finished",
      progress: { watched: 62, aired: 62, total: 62 },
    },
  },
};
