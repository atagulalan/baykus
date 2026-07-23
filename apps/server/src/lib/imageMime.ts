/** Magic-byte sniff for avatar uploads when the multipart part has a missing/generic type. */

const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const GIF87 = Buffer.from("GIF87a");
const GIF89 = Buffer.from("GIF89a");
const RIFF = Buffer.from("RIFF");
const WEBP = Buffer.from("WEBP");

export const ALLOWED_AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** True when the client omitted a useful Content-Type (common for RN Blob uploads). */
export function isGenericImageUploadType(mimeType: string): boolean {
  return (
    mimeType === "" ||
    mimeType === "application/octet-stream" ||
    // iOS photo library often labels JPEG edits as HEIC even when bytes are JPEG.
    mimeType === "image/heic" ||
    mimeType === "image/heif"
  );
}

export function sniffImageMime(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes.subarray(0, 3).equals(JPEG)) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(PNG)) return "image/png";
  if (bytes.length >= 6 && (bytes.subarray(0, 6).equals(GIF87) || bytes.subarray(0, 6).equals(GIF89))) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).equals(RIFF) &&
    bytes.subarray(8, 12).equals(WEBP)
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Resolve the MIME we store for an avatar: trust an allow-listed declared type,
 * otherwise sniff bytes when the declaration is empty/generic.
 */
export function resolveAvatarMime(declaredType: string, bytes: Buffer): string | null {
  if (ALLOWED_AVATAR_MIME_TYPES.has(declaredType)) return declaredType;
  if (!isGenericImageUploadType(declaredType)) return null;
  const sniffed = sniffImageMime(bytes);
  return sniffed && ALLOWED_AVATAR_MIME_TYPES.has(sniffed) ? sniffed : null;
}
