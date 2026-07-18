import type { Library, SettingsPatch, UiPrefs } from "@baykus/core";
import type { MetadataProvider } from "@baykus/provider-sdk";
import { Hono } from "hono";
import { z } from "zod";
import { ApiError } from "../middleware/errors.ts";
import { effectiveScrapersEnabled, refreshProviders } from "../providers/registry.ts";

/** WP4: profile photo upload — reasonable caps for a small avatar, not a media library. */
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const librarySortSchema = z.enum(["lastWatched", "added", "title", "rating", "nextAir"]);

const watchCategorySchema = z.enum([
  "needs_review",
  "watching",
  "not_watched_recently",
  "not_started",
  "watch_later",
  "up_to_date",
  "finished",
  "stopped",
]);

const uiPrefsSchema = z.object({
  libraryBrowse: z.object({
    sort: librarySortSchema,
    category: z.array(watchCategorySchema),
  }),
  watchSections: z.array(watchCategorySchema),
  watchSectionSorts: z.partialRecord(watchCategorySchema, librarySortSchema),
  historyCollapsed: z.boolean(),
  skipSectionRemoveConfirm: z.boolean(),
  showNextUpCarousel: z.boolean(),
  browseView: z.enum(["list", "grid"]).default("list"),
});

const patchSettingsSchema = z
  .object({
    locale: z.enum(["tr", "en"]).optional(),
    region: z.string().length(2).optional(),
    theme: z.enum(["dark", "light", "system"]).optional(),
    scrapersEnabled: z.boolean().optional(),
    tmdbApiKey: z.string().nullable().optional(),
    watchingWindowDays: z.number().int().min(1).max(365).optional(),
    episodeLabelFormat: z.enum(["SxEy", "S01E06", "compact"]).optional(),
    spoilerProtection: z.boolean().optional(),
    defaultStartPage: z.enum(["home", "calendar", "stats"]).optional(),
    newSeriesDefaultStatus: z.enum(["watching", "watchlist"]).optional(),
    uiPrefs: uiPrefsSchema.nullable().optional(),
    /** WP4: an ImageRef ("provider:path") of a watched series' backdrop, or null to clear. */
    bannerRef: z.string().min(1).nullable().optional(),
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
  if (parsed.episodeLabelFormat !== undefined) {
    patch.episodeLabelFormat = parsed.episodeLabelFormat;
  }
  if (parsed.spoilerProtection !== undefined) {
    patch.spoilerProtection = parsed.spoilerProtection;
  }
  if (parsed.defaultStartPage !== undefined) {
    patch.defaultStartPage = parsed.defaultStartPage;
  }
  if (parsed.newSeriesDefaultStatus !== undefined) {
    patch.newSeriesDefaultStatus = parsed.newSeriesDefaultStatus;
  }
  if (parsed.uiPrefs !== undefined) {
    patch.uiPrefs = parsed.uiPrefs as UiPrefs | null;
  }
  if (parsed.bannerRef !== undefined) {
    patch.bannerRef = parsed.bannerRef;
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

  /**
   * WP4: profile photo upload — stored as raw bytes in the `profile_media`
   * table (0006_profile_media migration), works identically in single and
   * multi mode (each library, single or per-account, already owns its own
   * tables). See settings.ts's `setAvatar` doc comment.
   */
  app.post("/api/settings/avatar", async (c) => {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) {
      throw new ApiError("VALIDATION_FAILED", "multipart field 'file' (image) is required");
    }
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
      throw new ApiError("VALIDATION_FAILED", `unsupported image type "${file.type}"`);
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new ApiError("PAYLOAD_TOO_LARGE", "avatar image exceeds 3 MB");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const settings = library.setAvatar(file.type, bytes);
    return c.json(settings);
  });

  app.get("/api/settings/avatar", (c) => {
    const avatar = library.getAvatar();
    if (!avatar) throw new ApiError("NOT_FOUND", "no profile photo set");

    c.header("Content-Type", avatar.mimeType);
    // The `v=` query param (the avatarRef token) changes on every re-upload, so an
    // immutable cache is safe — a stale browser cache never outlives the ref that named it.
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    return c.body(new Uint8Array(avatar.data));
  });

  return app;
}
