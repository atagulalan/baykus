import type { Preview } from "@storybook/react";
import "../src/storybook.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "void",
      values: [{ name: "void", value: "#080808" }],
    },
    layout: "padded",
  },
};

export default preview;
