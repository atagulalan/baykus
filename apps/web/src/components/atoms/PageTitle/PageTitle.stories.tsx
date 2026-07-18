import type { Meta, StoryObj } from "@storybook/react-vite";
import { PageTitle } from "./PageTitle.tsx";

const meta = {
  title: "Atoms/PageTitle",
  component: PageTitle,
  args: { children: "Library" },
} satisfies Meta<typeof PageTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
