import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import { noop } from "../../../../.storybook/mocks.ts";
import { RestoreBackupDialog } from "./RestoreBackupDialog.tsx";

const meta = {
  title: "Dialogs/RestoreBackupDialog",
  component: RestoreBackupDialog,
  decorators: [withAppProviders],
  args: { onClose: noop },
} satisfies Meta<typeof RestoreBackupDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ReplaceMode: Story = {
  args: { initialImportMode: "replace" },
};

export const Success: Story = {
  args: {
    initialImportResult: {
      items: 42,
      watches: 800,
      ratings: 120,
      mode: "merge",
      warnings: ["Skipped 2 duplicate entries"],
    },
  },
};

/** Select a `.zip` file to enable the import button (pending state while uploading). */
export const PendingHint: Story = {
  parameters: {
    docs: {
      description: {
        story: "Choose a zip file via the file input, then click Import to see the pending label.",
      },
    },
  },
};
