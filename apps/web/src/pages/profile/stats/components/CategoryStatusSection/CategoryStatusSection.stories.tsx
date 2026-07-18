import type { Meta, StoryObj } from "@storybook/react-vite";
import { mockEmptyStats, mockStats } from "../../../../../../.storybook/mocks.ts";
import { hiddenWhenEmptyParameters } from "../../../../../../.storybook/storyHelpers.ts";
import { CategoryStatusSection } from "./CategoryStatusSection.tsx";

const meta = {
  title: "Stats/CategoryStatusSection",
  component: CategoryStatusSection,
  args: { stats: mockStats },
  parameters: { layout: "padded" },
} satisfies Meta<typeof CategoryStatusSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HiddenWhenEmpty: Story = {
  args: { stats: mockEmptyStats },
  parameters: hiddenWhenEmptyParameters,
};
