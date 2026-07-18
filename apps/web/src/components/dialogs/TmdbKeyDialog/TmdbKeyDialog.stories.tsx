import type { Meta, StoryObj } from "@storybook/react-vite";
import { noop } from "../../../../.storybook/mocks.ts";
import { TmdbKeyDialog } from "./TmdbKeyDialog.tsx";

const meta = {
  title: "Dialogs/TmdbKeyDialog",
  component: TmdbKeyDialog,
  args: {
    onClose: noop,
    onSave: noop,
    onClear: noop,
    pending: false,
    isSet: false,
  },
} satisfies Meta<typeof TmdbKeyDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const KeySet: Story = { args: { isSet: true } };

export const Pending: Story = { args: { pending: true } };
