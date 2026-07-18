import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { noop } from "../../../../.storybook/mocks.ts";
import { Modal } from "./Modal.tsx";

const meta = {
  title: "Molecules/Modal",
  component: Modal,
  args: {
    isOpen: true,
    onClose: noop,
    children: <p className="p-4 text-sm text-snow">Modal body content</p>,
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Centered: Story = {};

export const WithTitle: Story = {
  args: {
    title: "Sheet title",
    className: "p-4",
    children: <p className="text-sm text-snow">Bottom sheet content on mobile.</p>,
  },
};

export const Popover: Story = {
  render: function PopoverModal(args) {
    const [open, setOpen] = useState(true);
    return (
      <div className="relative flex h-40 w-full items-start justify-end p-8">
        <button
          type="button"
          className="rounded border border-white/10 px-3 py-1 text-sm text-snow"
          onClick={() => setOpen(true)}
        >
          Open popover
        </button>
        <Modal
          {...args}
          isOpen={open}
          onClose={() => setOpen(false)}
          desktop="popover"
          popoverClassName="w-56 p-3"
        >
          <p className="text-sm text-snow">Popover panel</p>
        </Modal>
      </div>
    );
  },
  args: { desktop: "popover" },
};

export const Closed: Story = { args: { isOpen: false } };
