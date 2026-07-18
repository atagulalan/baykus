import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef } from "react";
import { noop } from "../../../../.storybook/mocks.ts";
import { SettingsSelect } from "./SettingsSelect.tsx";

const meta = {
  title: "Atoms/SettingsSelect",
  component: SettingsSelect,
  args: {
    label: "Theme",
    value: "dark",
    options: [
      { value: "dark", label: "Dark" },
      { value: "light", label: "Light" },
      { value: "system", label: "System" },
    ],
    onChange: noop,
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof SettingsSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = {
  args: { hint: "Applies to the entire app shell." },
};

export const Open: Story = {
  render: function OpenSelect(args) {
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      rootRef.current?.querySelector("button")?.click();
    }, []);
    return (
      <div ref={rootRef} className="w-full max-w-md border border-white/10 bg-void">
        <SettingsSelect {...args} />
      </div>
    );
  },
};
