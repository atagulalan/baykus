import { buildAvatarUrl } from "@baykus/api-client";
import { useEffect, useState } from "react";
import { getAccessToken } from "./session.ts";

export type AvatarImageSource = {
  uri: string;
};

/**
 * Resolve `/api/settings/avatar` for RN Image.
 *
 * Fetch with Bearer (when present) and expose a data URI — native `Image`
 * header auth is unreliable across iOS/Android, and a bare URI 401s in multi /
 * password-gated single mode.
 */
export function useAvatarImageSource(
  avatarRef: string | null,
): AvatarImageSource | null {
  const [source, setSource] = useState<AvatarImageSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = buildAvatarUrl(avatarRef);
    if (!url) {
      setSource(null);
      return;
    }

    void (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          if (!cancelled) setSource(null);
          return;
        }
        const mime = res.headers.get("content-type") ?? "image/jpeg";
        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        const dataUri = `data:${mime};base64,${btoa(binary)}`;
        if (!cancelled) setSource({ uri: dataUri });
      } catch {
        if (!cancelled) setSource(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [avatarRef]);

  return source;
}
