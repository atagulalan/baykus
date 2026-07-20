import type { Meta, StoryObj } from "@storybook/react-vite";
import { noop } from "../../../../.storybook/mocks.ts";
import { DeleteAccountDialog } from "./DeleteAccountDialog.tsx";

const meta = {
  title: "Dialogs/DeleteAccountDialog",
  component: DeleteAccountDialog,
  args: {
    onConfirm: noop,
    onClose: noop,
    pending: false,
    error: false,
    hasPassword: true,
    identities: [],
    oauthProviders: {},
  },
} satisfies Meta<typeof DeleteAccountDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pending: Story = { args: { pending: true } };

export const WithError: Story = { args: { error: true } };

export const OAuthOnly: Story = {
  args: {
    hasPassword: false,
    identities: ["google"],
    oauthProviders: { google: { clientId: "web-client.apps.googleusercontent.com" } },
  },
};
