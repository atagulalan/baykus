import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReleaseTime } from "./ReleaseTime.tsx";

const meta = {
  title: "Atoms/ReleaseTime",
  component: ReleaseTime,
  args: { itemId: 1 },
} satisfies Meta<typeof ReleaseTime>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
