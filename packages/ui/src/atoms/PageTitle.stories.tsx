import type { Meta, StoryObj } from "@storybook/react";
import { voidDecorator } from "../storybook/decorators.tsx";
import { PageTitle } from "./PageTitle.tsx";

/**
 * First leaf-atom strangler check: `@baykus/ui` PageTitle on RN Web + NativeWind
 * (Tailwind 3), separate from production Vite (Tailwind v4).
 */
const meta = {
  title: "atoms/PageTitle",
  component: PageTitle,
  decorators: [voidDecorator],
} satisfies Meta<typeof PageTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "baykuş",
  },
};
