import type { Meta, StoryObj } from "@storybook/react-vite";
import { mockEmptyStats, mockStats } from "../../../../../../.storybook/mocks.ts";
import { hiddenWhenEmptyParameters } from "../../../../../../.storybook/storyHelpers.ts";
import { ProductionSection } from "./ProductionSection.tsx";

const meta = {
  title: "Stats/ProductionSection",
  component: ProductionSection,
  args: { stats: mockStats },
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductionSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HiddenWhenEmpty: Story = {
  args: { stats: mockEmptyStats },
  parameters: hiddenWhenEmptyParameters,
};
