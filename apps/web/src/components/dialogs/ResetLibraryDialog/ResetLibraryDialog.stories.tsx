import type { Meta, StoryObj } from "@storybook/react-vite";
import { noop } from "../../../../.storybook/mocks.ts";
import { ResetLibraryDialog } from "./ResetLibraryDialog.tsx";

const meta = {
  title: "Dialogs/ResetLibraryDialog",
  component: ResetLibraryDialog,
  args: {
    onConfirm: noop,
    onClose: noop,
    pending: false,
    error: false,
  },
} satisfies Meta<typeof ResetLibraryDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pending: Story = { args: { pending: true } };

export const WithError: Story = { args: { error: true } };
