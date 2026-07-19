import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReleaseTime } from "./ReleaseTime.tsx";

const meta = {
  title: "Atoms/ReleaseTime",
  component: ReleaseTime,
  args: { airStamp: "2026-07-20T03:00:00Z" },
} satisfies Meta<typeof ReleaseTime>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
