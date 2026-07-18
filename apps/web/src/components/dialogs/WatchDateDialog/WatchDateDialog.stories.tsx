import type { Meta, StoryObj } from "@storybook/react-vite";
import { noop } from "../../../../.storybook/mocks.ts";
import { WatchDateDialog } from "./WatchDateDialog.tsx";

const meta = {
  title: "Dialogs/WatchDateDialog",
  component: WatchDateDialog,
  args: {
    initialValue: "2026-07-15T20:00",
    onConfirm: noop,
    onClose: noop,
  },
} satisfies Meta<typeof WatchDateDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Midnight: Story = {
  args: { initialValue: "2026-01-01T00:00:00.000Z" },
};

export const PresetsDocumented: Story = {
  parameters: {
    docs: {
      description: {
        story: "Use the Now / Yesterday preset buttons to fill date and time fields.",
      },
    },
  },
};
