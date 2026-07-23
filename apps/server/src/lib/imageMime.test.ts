import { describe, expect, it } from "vitest";
import { resolveAvatarMime, sniffImageMime } from "./imageMime.ts";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("sniffImageMime", () => {
  it("detects PNG", () => {
    expect(sniffImageMime(TINY_PNG)).toBe("image/png");
  });

  it("detects JPEG SOI", () => {
    expect(sniffImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
  });

  it("returns null for unknown bytes", () => {
    expect(sniffImageMime(Buffer.from([1, 2, 3]))).toBeNull();
  });
});

describe("resolveAvatarMime", () => {
  it("keeps an allow-listed declared type", () => {
    expect(resolveAvatarMime("image/png", TINY_PNG)).toBe("image/png");
  });

  it("sniffs when the declared type is empty", () => {
    expect(resolveAvatarMime("", TINY_PNG)).toBe("image/png");
  });

  it("sniffs when the declared type is octet-stream", () => {
    expect(resolveAvatarMime("application/octet-stream", TINY_PNG)).toBe("image/png");
  });

  it("sniffs when iOS mislabels a JPEG as image/heic", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(resolveAvatarMime("image/heic", jpeg)).toBe("image/jpeg");
  });
});
