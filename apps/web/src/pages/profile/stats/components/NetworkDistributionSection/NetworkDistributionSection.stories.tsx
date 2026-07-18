import type { Meta, StoryObj } from "@storybook/react-vite";
import { mockEmptyStats, mockStats } from "../../../../../../.storybook/mocks.ts";
import { hiddenWhenEmptyParameters } from "../../../../../../.storybook/storyHelpers.ts";
import { NetworkDistributionSection } from "./NetworkDistributionSection.tsx";

const meta = {
  title: "Stats/NetworkDistributionSection",
  component: NetworkDistributionSection,
  args: { stats: mockStats },
  parameters: { layout: "padded" },
} satisfies Meta<typeof NetworkDistributionSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HiddenWhenEmpty: Story = {
  args: { stats: mockEmptyStats },
  parameters: hiddenWhenEmptyParameters,
};
