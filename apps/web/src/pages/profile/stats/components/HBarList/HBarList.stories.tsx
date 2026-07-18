import type { Meta, StoryObj } from "@storybook/react-vite";
import { HBarList } from "./HBarList.tsx";

const meta = {
  title: "Stats/HBarList",
  component: HBarList,
  args: {
    items: [
      { key: "bb", label: "Breaking Bad", value: 4200, displayValue: "70h" },
      { key: "wire", label: "The Wire", value: 3800, displayValue: "63h" },
      { key: "sev", label: "Severance", value: 2100, displayValue: "35h" },
    ],
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof HBarList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { items: [] } };
