import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // listen on 0.0.0.0 — LAN + localhost
    proxy: {
      "/api": "http://localhost:4004",
      "/img": "http://localhost:4004",
    },
  },
});
