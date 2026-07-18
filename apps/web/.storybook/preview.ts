import type { Preview } from "@storybook/react-vite";
import "../src/i18n/index.ts";
import "../src/index.css";
import { withLocaleToolbar } from "./decorators.tsx";

const preview: Preview = {
  decorators: [withLocaleToolbar],
  globalTypes: {
    locale: {
      description: "UI locale (i18n)",
      defaultValue: "tr",
      toolbar: {
        icon: "globe",
        items: [
          { value: "tr", title: "Türkçe" },
          { value: "en", title: "English" },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "void",
      values: [{ name: "void", value: "#080808" }],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
    viewport: {
      viewports: {
        mobile: {
          name: "Mobile",
          styles: { width: "390px", height: "844px" },
        },
        tablet: {
          name: "Tablet",
          styles: { width: "768px", height: "1024px" },
        },
        desktop: {
          name: "Desktop",
          styles: { width: "1280px", height: "800px" },
        },
      },
    },
  },
};

export default preview;
