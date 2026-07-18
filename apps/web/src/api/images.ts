export type ImageSize = "thumb" | "medium" | "large" | "original";

/** Builds a `/img/:provider/:size/:encodedPath` URL from a stored `provider:path` ref. */
export function buildImageUrl(
  ref: string | null | undefined,
  size: ImageSize = "medium",
): string | null {
  if (!ref) return null;
  const sep = ref.indexOf(":");
  if (sep === -1) return null;
  const providerId = ref.slice(0, sep);
  const path = ref.slice(sep + 1);
  if (!providerId || !path) return null;
  return `/img/${providerId}/${size}/${encodeURIComponent(path)}`;
}

/**
 * WP4: uploaded profile photo — not a provider ref, served from
 * GET /api/settings/avatar. `avatarRef` (Settings.avatarRef, an upload
 * timestamp) is appended as a cache-busting query param since the response
 * carries an `immutable` cache header.
 */
export function buildAvatarUrl(avatarRef: string | null | undefined): string | null {
  if (!avatarRef) return null;
  return `/api/settings/avatar?v=${encodeURIComponent(avatarRef)}`;
}
