import type { Meta, StoryObj } from "@storybook/react-vite";
import { MiniBars } from "./MiniBars.tsx";

const meta = {
  title: "Stats/MiniBars",
  component: MiniBars,
  args: {
    items: [
      { key: "jan", label: "Jan", value: 42, tooltip: "January: 42 episodes" },
      { key: "feb", label: "Feb", value: 38, tooltip: "February: 38 episodes" },
      { key: "mar", label: "Mar", value: 55, tooltip: "March: 55 episodes" },
      { key: "apr", label: "Apr", value: 48, tooltip: "April: 48 episodes" },
    ],
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof MiniBars>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
