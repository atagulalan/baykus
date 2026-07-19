import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const webRoot = path.resolve(import.meta.dirname, "apps/web");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.join(webRoot, "node_modules/react"),
      "react-dom": path.join(webRoot, "node_modules/react-dom"),
    },
  },
  test: {
    name: "unit",
    include: ["apps/**/src/**/*.test.{ts,tsx}", "packages/**/src/**/*.test.ts"],
    environment: "node",
    environmentMatchGlobs: [["apps/web/src/**/*.test.tsx", "jsdom"]],
    setupFiles: ["apps/web/src/test/setup.ts"],
  },
});
