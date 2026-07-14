import { getCachedImage } from "@baykus/core";
import type { ImageRef, MetadataProvider } from "@baykus/provider-sdk";
import { Hono } from "hono";
import { ApiError } from "../middleware/errors.ts";

const SIZES = ["thumb", "medium", "large", "original"] as const;
type ImgSize = (typeof SIZES)[number];

function isImgSize(value: string): value is ImgSize {
  return (SIZES as readonly string[]).includes(value);
}

/** contracts/api.md §Images. Auth-exempt (mounted outside the mutating-method guard scope isn't needed — GET is never guarded). */
export function createImageRoute(providers: MetadataProvider[], dataDir: string): Hono {
  const app = new Hono();

  app.get("/img/:providerId/:size/:path", async (c) => {
    const { providerId, size, path } = c.req.param();
    const provider = providers.find((p) => p.id === providerId);
    if (!provider || !isImgSize(size)) {
      throw new ApiError("NOT_FOUND", `unknown provider "${providerId}" or size "${size}"`);
    }

    const ref: ImageRef = `${providerId}:${path}`;
    const sourceUrl = provider.resolveImageUrl(ref, size);
    const cacheKey = `${providerId}:${size}:${path}`;

    try {
      const { contentType, body } = await getCachedImage(dataDir, cacheKey, sourceUrl);
      c.header("Content-Type", contentType);
      c.header("Cache-Control", "public, max-age=31536000, immutable");
      return c.body(new Uint8Array(body));
    } catch {
      throw new ApiError("NOT_FOUND", "image fetch failed");
    }
  });

  return app;
}
