import type { Library, SettingsPatch } from "@baykus/core";
import type { MetadataProvider } from "@baykus/provider-sdk";
import { Hono } from "hono";
import { z } from "zod";
import { effectiveScrapersEnabled, refreshProviders } from "../providers/registry.ts";

const patchSettingsSchema = z
  .object({
    locale: z.enum(["tr", "en"]).optional(),
    region: z.string().length(2).optional(),
    theme: z.enum(["dark", "light", "system"]).optional(),
    scrapersEnabled: z.boolean().optional(),
    tmdbApiKey: z.string().nullable().optional(),
    watchingWindowDays: z.number().int().min(1).max(365).optional(),
  })
  .strict();

function toSettingsPatch(parsed: z.infer<typeof patchSettingsSchema>): SettingsPatch {
  const patch: SettingsPatch = {};
  if (parsed.locale !== undefined) patch.locale = parsed.locale;
  if (parsed.region !== undefined) patch.region = parsed.region;
  if (parsed.theme !== undefined) patch.theme = parsed.theme;
  if (parsed.scrapersEnabled !== undefined) patch.scrapersEnabled = parsed.scrapersEnabled;
  if (parsed.tmdbApiKey !== undefined) patch.tmdbApiKey = parsed.tmdbApiKey;
  if (parsed.watchingWindowDays !== undefined) {
    patch.watchingWindowDays = parsed.watchingWindowDays;
  }
  return patch;
}

/**
 * No endpoint shape for /api/settings is defined in contracts/api.md — the
 * shape here (GET/PATCH, tmdbApiKey write-only via a boolean *Set flag) is
 * the smallest reasonable choice, derived from data-model.md's `settings`
 * table and ui.md §Settings.
 */
export function createSettingsRoutes(
  library: Library,
  providers: MetadataProvider[],
  envTmdbApiKey: string | undefined,
  dataDir: string,
  mode: "single" | "multi",
  envScrapersEnabled: string | undefined,
): Hono {
  const app = new Hono();

  app.get("/api/settings", (c) => c.json(library.getSettings()));

  app.patch("/api/settings", async (c) => {
    const body = patchSettingsSchema.parse(await c.req.json());
    const settings = library.updateSettings(toSettingsPatch(body));

    if (body.tmdbApiKey !== undefined || body.scrapersEnabled !== undefined) {
      const activeKey = library.getTmdbApiKey() ?? envTmdbApiKey;
      refreshProviders(providers, {
        ...(activeKey ? { tmdbApiKey: activeKey } : {}),
        scrapersEnabled: effectiveScrapersEnabled(settings.scrapersEnabled, envScrapersEnabled),
        dataDir,
        mode,
      });
    }

    return c.json(settings);
  });

  return app;
}
