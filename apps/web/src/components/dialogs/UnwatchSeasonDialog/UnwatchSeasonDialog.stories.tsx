import type { Meta, StoryObj } from "@storybook/react-vite";
import { noop } from "../../../../.storybook/mocks.ts";
import { UnwatchSeasonDialog } from "./UnwatchSeasonDialog.tsx";

const meta = {
  title: "Dialogs/UnwatchSeasonDialog",
  component: UnwatchSeasonDialog,
  args: {
    onConfirm: noop,
    onClose: noop,
  },
} satisfies Meta<typeof UnwatchSeasonDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
