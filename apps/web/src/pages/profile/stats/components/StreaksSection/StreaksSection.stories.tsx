import type { Meta, StoryObj } from "@storybook/react-vite";
import { mockEmptyStats, mockStats } from "../../../../../../.storybook/mocks.ts";
import { hiddenWhenEmptyParameters } from "../../../../../../.storybook/storyHelpers.ts";
import { StreaksSection } from "./StreaksSection.tsx";

const meta = {
  title: "Stats/StreaksSection",
  component: StreaksSection,
  args: { stats: mockStats },
  parameters: { layout: "padded" },
} satisfies Meta<typeof StreaksSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HiddenWhenEmpty: Story = {
  args: { stats: mockEmptyStats },
  parameters: hiddenWhenEmptyParameters,
};
