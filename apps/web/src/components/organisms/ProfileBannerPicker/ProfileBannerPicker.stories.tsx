import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef } from "react";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import { ProfileBannerPicker } from "./ProfileBannerPicker.tsx";

const meta = {
  title: "Organisms/ProfileBannerPicker",
  component: ProfileBannerPicker,
  decorators: [withAppProviders],
  args: {
    bannerRef: null,
    children: (openPicker: () => void) => (
      <button
        type="button"
        className="rounded border border-white/10 px-4 py-2 text-sm text-snow"
        onClick={openPicker}
      >
        Change banner
      </button>
    ),
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ProfileBannerPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: { bannerRef: "backdrop-1" },
};

export const ModalOpen: Story = {
  render: function ModalOpenStory(args) {
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      rootRef.current?.querySelector("button")?.click();
    }, []);
    return (
      <div ref={rootRef}>
        <ProfileBannerPicker {...args} />
      </div>
    );
  },
};
