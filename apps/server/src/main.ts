import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";

const config = loadConfig();
const app = createApp(config);

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`baykuş server (${config.BAYKUS_MODE} mode) → http://localhost:${info.port}`);
});
