import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OAuthCallbackResult, OAuthProvider } from "../../../api/types.ts";
import {
  beginGoogleSignIn,
  hasPendingGoogleIdToken,
  obtainIdToken,
  takePendingGoogleIdToken,
} from "../../../lib/oauth.ts";

const OAUTH_BTN =
  "rounded-full border border-white/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-snow transition-colors hover:border-white/20 hover:bg-white/5 disabled:opacity-50";

interface OAuthButtonsProps {
  providers: {
    google?: { clientId: string };
    apple?: { clientId: string };
  };
  onAuthenticated: (result: Extract<OAuthCallbackResult, { status: "authenticated" }>) => void;
  onNeedsHandle: (pendingToken: string) => void;
  onError?: () => void;
  /** POST /api/auth/oauth/callback */
  callback: (payload: {
    provider: OAuthProvider;
    idToken: string;
    nonce?: string;
  }) => Promise<OAuthCallbackResult>;
}

export function OAuthButtons({
  providers,
  onAuthenticated,
  onNeedsHandle,
  onError,
  callback,
}: OAuthButtonsProps) {
  const { t } = useTranslation();
  const [localError, setLocalError] = useState<string | null>(null);
  const googleReturnHandled = useRef(false);

  const finish = useMutation({
    mutationFn: (payload: { provider: OAuthProvider; idToken: string; nonce?: string }) =>
      callback(payload),
    onSuccess: (result) => {
      setLocalError(null);
      if (result.status === "authenticated") onAuthenticated(result);
      else onNeedsHandle(result.pendingToken);
    },
    onError: (err) => {
      setLocalError(err instanceof Error ? err.message : t("auth.oauth.error"));
      onError?.();
    },
  });

  // Complete Google redirect return (sessionStorage handoff from oauth-google.html).
  useEffect(() => {
    if (googleReturnHandled.current) return;
    if (!providers.google) return;
    if (!hasPendingGoogleIdToken()) return;
    googleReturnHandled.current = true;
    try {
      const idToken = takePendingGoogleIdToken();
      if (idToken) finish.mutate({ provider: "google", idToken });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t("auth.oauth.error"));
      onError?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount when returning from Google
  }, [providers.google?.clientId]);

  const appleMutation = useMutation({
    mutationFn: async () => {
      const clientId = providers.apple?.clientId;
      if (!clientId) throw new Error("apple not configured");
      const { idToken, nonce } = await obtainIdToken("apple", clientId);
      return finish.mutateAsync({
        provider: "apple",
        idToken,
        ...(nonce !== undefined ? { nonce } : {}),
      });
    },
    onError: () => onError?.(),
  });

  const entries = (["google", "apple"] as const).filter((p) =>
    p === "google" ? providers.google : providers.apple,
  );
  if (entries.length === 0) return null;

  const busy = finish.isPending || appleMutation.isPending;
  const err =
    localError ??
    (finish.isError || appleMutation.isError
      ? finish.error instanceof Error &&
        (finish.error.message === "redirect_uri_mismatch" ||
          finish.error.message === "unregistered_origin")
        ? t("auth.oauth.errorUnregisteredOrigin", { origin: window.location.origin })
        : t("auth.oauth.error")
      : null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted text-xs">
        <span className="h-px flex-1 bg-white/10" />
        {t("auth.oauth.or")}
        <span className="h-px flex-1 bg-white/10" />
      </div>
      {entries.map((provider) => (
        <button
          key={provider}
          type="button"
          disabled={busy}
          onClick={() => {
            setLocalError(null);
            if (provider === "google") {
              const clientId = providers.google?.clientId;
              if (!clientId) return;
              beginGoogleSignIn(clientId, "/login");
              return;
            }
            appleMutation.mutate();
          }}
          className={OAUTH_BTN}
        >
          {provider === "google" ? t("auth.oauth.google") : t("auth.oauth.apple")}
        </button>
      ))}
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
