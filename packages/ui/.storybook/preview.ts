import type { Preview } from "@storybook/react";
import { createElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../src/storybook.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "void",
      values: [{ name: "void", value: "#080808" }],
    },
    layout: "padded",
  },
  decorators: [(Story) => createElement(SafeAreaProvider, null, createElement(Story))],
};

export default preview;
