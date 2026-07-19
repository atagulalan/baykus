import type { Meta, StoryObj } from "@storybook/react-vite";
import { mockEmptyStats, mockStats } from "../../../../../../.storybook/mocks.ts";
import { RatingDistributionSection } from "./RatingDistributionSection.tsx";

const meta = {
  title: "Stats/RatingDistributionSection",
  component: RatingDistributionSection,
  args: { stats: mockStats },
  parameters: { layout: "padded" },
} satisfies Meta<typeof RatingDistributionSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { stats: mockEmptyStats },
};
