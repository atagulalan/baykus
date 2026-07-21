import type { Meta, StoryObj } from "@storybook/react";
import { voidDecorator } from "../storybook/decorators.tsx";
import { ReleaseTime } from "./ReleaseTime.tsx";

const meta = {
  title: "atoms/ReleaseTime",
  component: ReleaseTime,
  decorators: [voidDecorator],
} satisfies Meta<typeof ReleaseTime>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    airStamp: "2024-06-15T20:00:00.000Z",
    label: "Airs",
    locale: "tr",
  },
};
