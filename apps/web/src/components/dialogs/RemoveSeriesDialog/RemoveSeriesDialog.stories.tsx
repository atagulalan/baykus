import type { Meta, StoryObj } from "@storybook/react-vite";
import { noop } from "../../../../.storybook/mocks.ts";
import { RemoveSeriesDialog } from "./RemoveSeriesDialog.tsx";

const meta = {
  title: "Dialogs/RemoveSeriesDialog",
  component: RemoveSeriesDialog,
  args: {
    title: "Breaking Bad",
    onConfirm: noop,
    onClose: noop,
  },
} satisfies Meta<typeof RemoveSeriesDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
