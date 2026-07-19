import type { Meta, StoryObj } from "@storybook/react-vite";
import { withRouter } from "../../../../../../.storybook/decorators.tsx";
import { mockEmptyStats, mockStats } from "../../../../../../.storybook/mocks.ts";
import { hiddenWhenEmptyParameters } from "../../../../../../.storybook/storyHelpers.ts";
import { RewatchSummarySection } from "./RewatchSummarySection.tsx";

const meta = {
  title: "Stats/RewatchSummarySection",
  component: RewatchSummarySection,
  decorators: [withRouter],
  args: { stats: mockStats },
  parameters: { layout: "padded" },
} satisfies Meta<typeof RewatchSummarySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HiddenWhenEmpty: Story = {
  args: { stats: mockEmptyStats },
  parameters: hiddenWhenEmptyParameters,
};
