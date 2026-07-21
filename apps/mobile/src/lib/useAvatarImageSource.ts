import { buildAvatarUrl } from "@baykus/api-client";
import { useEffect, useState } from "react";
import { getAccessToken } from "./session.ts";

export type AvatarImageSource = {
  uri: string;
  headers?: Record<string, string>;
};

/**
 * Resolve `/api/settings/avatar` for RN Image — Bearer must be on the request
 * (cookies don't apply; plain `uri` alone 401s in multi / password-gated single).
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
      const token = await getAccessToken();
      if (cancelled) return;
      setSource({
        uri: url,
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [avatarRef]);

  return source;
}
