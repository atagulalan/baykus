import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import { ProfilePhotoUpload } from "./ProfilePhotoUpload.tsx";

const meta = {
  title: "Organisms/ProfilePhotoUpload",
  component: ProfilePhotoUpload,
  decorators: [withAppProviders],
  args: { avatarRef: null },
} satisfies Meta<typeof ProfilePhotoUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAvatar: Story = {
  args: { avatarRef: "avatar-1" },
};
