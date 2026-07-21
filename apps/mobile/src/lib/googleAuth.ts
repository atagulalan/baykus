import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef } from "react";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export type GoogleClientIds = {
  /** First / web client ID (014 E122 — also used as Expo Go fallback). */
  webClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
};

/**
 * Resolve Google OAuth client IDs for AuthSession.
 * Prefer platform-native IDs from env (must be non-first entries in
 * `BAYKUS_GOOGLE_CLIENT_IDS`). Fall back to the session-exposed web ID.
 */
export function resolveGoogleClientIds(sessionWebClientId?: string): GoogleClientIds {
  const web =
    readEnv("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID") ??
    readEnv("EXPO_PUBLIC_GOOGLE_CLIENT_ID") ??
    sessionWebClientId;
  return {
    ...(web ? { webClientId: web } : {}),
    ...(readEnv("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID")
      ? { iosClientId: readEnv("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID") }
      : {}),
    ...(readEnv("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID")
      ? { androidClientId: readEnv("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID") }
      : {}),
  };
}

export function googleAuthConfigured(ids: GoogleClientIds): boolean {
  if (Platform.OS === "ios") return Boolean(ids.iosClientId ?? ids.webClientId);
  if (Platform.OS === "android") return Boolean(ids.androidClientId ?? ids.webClientId);
  return Boolean(ids.webClientId);
}

export type UseGoogleIdTokenOptions = {
  ids: GoogleClientIds;
  onIdToken: (idToken: string) => void | Promise<void>;
  onError?: (message: string) => void;
  /** Browser dismissed / cancel — clear UI busy state. */
  onCancel?: () => void;
};

/**
 * Google Sign-In via expo-auth-session → `id_token` for POST /auth/oauth/callback.
 * Mount only when `googleAuthConfigured(ids)` is true (AuthSession requires a client id).
 */
export function useGoogleIdToken({ ids, onIdToken, onError, onCancel }: UseGoogleIdTokenOptions): {
  ready: boolean;
  prompt: () => Promise<void>;
} {
  const handled = useRef<string | null>(null);
  const onIdTokenRef = useRef(onIdToken);
  const onErrorRef = useRef(onError);
  const onCancelRef = useRef(onCancel);
  onIdTokenRef.current = onIdToken;
  onErrorRef.current = onError;
  onCancelRef.current = onCancel;

  const config = useMemo(
    () => ({
      ...(ids.webClientId ? { webClientId: ids.webClientId, clientId: ids.webClientId } : {}),
      ...(ids.iosClientId ? { iosClientId: ids.iosClientId } : {}),
      ...(ids.androidClientId ? { androidClientId: ids.androidClientId } : {}),
      selectAccount: true,
    }),
    [ids.webClientId, ids.iosClientId, ids.androidClientId],
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(config, {
    scheme: "baykus",
    path: "oauth",
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === "dismiss" || response.type === "cancel") {
      onCancelRef.current?.();
      return;
    }
    if (response.type !== "success") {
      onErrorRef.current?.(
        "error" in response && typeof response.error === "string"
          ? response.error
          : "google_oauth_failed",
      );
      return;
    }
    const idToken = response.params.id_token ?? response.authentication?.idToken ?? undefined;
    if (!idToken) {
      onErrorRef.current?.("google_missing_id_token");
      return;
    }
    if (handled.current === idToken) return;
    handled.current = idToken;
    void Promise.resolve(onIdTokenRef.current(idToken)).catch((err) => {
      onErrorRef.current?.(err instanceof Error ? err.message : "google_oauth_failed");
    });
  }, [response]);

  return {
    ready: request !== null,
    prompt: async () => {
      if (!request) {
        onErrorRef.current?.("google_not_ready");
        return;
      }
      handled.current = null;
      await promptAsync();
    },
  };
}
