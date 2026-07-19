import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircularProgress } from "./CircularProgress.tsx";

const meta = {
  title: "Atoms/CircularProgress",
  component: CircularProgress,
  args: { value: 40 },
  parameters: { layout: "centered" },
} satisfies Meta<typeof CircularProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { value: 0 } };
export const Partial: Story = { args: { value: 40 } };
export const Complete: Story = { args: { value: 100, complete: true } };
