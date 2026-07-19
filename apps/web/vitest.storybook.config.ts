import path from "node:path";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { defineConfig } from "vitest/config";

const webRoot = import.meta.dirname;

export default defineConfig({
  extends: "./vite.config.ts",
  server: {
    proxy: {},
  },
  plugins: [
    storybookTest({
      configDir: path.join(webRoot, ".storybook"),
      storybookScript: "pnpm --filter @baykus/web storybook -- --no-open",
    }),
  ],
  test: {
    name: "storybook",
    root: webRoot,
    browser: {
      enabled: true,
      headless: true,
      provider: "playwright",
      instances: [{ browser: "chromium" }],
    },
  },
});
