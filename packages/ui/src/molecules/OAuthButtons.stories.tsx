import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { voidDecorator } from "../storybook/decorators.tsx";
import { OAuthButtons } from "./OAuthButtons.tsx";

const meta = {
  title: "molecules/OAuthButtons",
  component: OAuthButtons,
  decorators: [voidDecorator],
} satisfies Meta<typeof OAuthButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GoogleAndApple: Story = {
  args: {
    providers: [
      { id: "google", label: "Continue with Google", available: true },
      { id: "apple", label: "Continue with Apple", available: true },
    ],
    onPress: () => {},
  },
  render: function Render() {
    const [busy, setBusy] = useState<"google" | "apple" | null>(null);
    return (
      <OAuthButtons
        providers={[
          { id: "google", label: "Continue with Google", available: true },
          { id: "apple", label: "Continue with Apple", available: true },
        ]}
        busyProvider={busy}
        onPress={(id) => {
          setBusy(id);
          setTimeout(() => setBusy(null), 800);
        }}
      />
    );
  },
};
