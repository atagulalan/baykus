import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface CachedImage {
  contentType: string;
  body: Buffer;
}

function cacheKeyHash(cacheKey: string): string {
  return createHash("sha256").update(cacheKey).digest("hex");
}

/**
 * Fetch-through disk cache keyed by an opaque string (typically
 * `${providerId}:${size}:${path}`). A cache hit never calls fetch — the body
 * is stored under its sha256 hash, with a small `.json` sidecar for the
 * content-type. Wipe-safe: deleting `<dataDir>/images/` just means the next
 * request repopulates it, nothing else references those files.
 */
export async function getCachedImage(
  dataDir: string,
  cacheKey: string,
  sourceUrl: string,
): Promise<CachedImage> {
  const imagesDir = join(dataDir, "images");
  mkdirSync(imagesDir, { recursive: true });

  const hash = cacheKeyHash(cacheKey);
  const bodyPath = join(imagesDir, hash);
  const metaPath = join(imagesDir, `${hash}.json`);

  if (existsSync(bodyPath) && existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as { contentType: string };
    return { contentType: meta.contentType, body: readFileSync(bodyPath) };
  }

  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`image fetch failed: ${sourceUrl} -> ${res.status}`);
  }
  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const body = Buffer.from(await res.arrayBuffer());

  writeFileSync(bodyPath, body);
  writeFileSync(metaPath, JSON.stringify({ contentType }));

  return { contentType, body };
}
