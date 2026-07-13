import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";

describe("server app", () => {
  it("GET /api/health reports ok and mode", async () => {
    const app = createApp(loadConfig({}));
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, mode: "single", version: "0.1.0" });
  });

  it("config defaults are single mode, port 4004, scrapers off", () => {
    const config = loadConfig({});
    expect(config.BAYKUS_MODE).toBe("single");
    expect(config.PORT).toBe(4004);
    expect(config.BAYKUS_ENABLE_SCRAPERS).toBe("0");
  });
});
