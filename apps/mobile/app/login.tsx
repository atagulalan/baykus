import { ApiError } from "@baykus/api-client";
import { OAuthButtons, type OAuthProviderId, PageTitle } from "@baykus/ui";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AUTH_LABEL_CLASS,
  AUTH_OUTLINE_BTN,
  AUTH_PRIMARY_BTN,
  AUTH_TEXT_LINK,
  AuthSheet,
  AuthTextInput,
} from "../src/auth/AuthSheet.tsx";
import { useAuth } from "../src/auth/AuthProvider.tsx";
import { stashClaimPrefill } from "../src/auth/claimPrefill.ts";
import { HANDLE_PATTERN, sanitizeHandleInput } from "../src/auth/handleInput.ts";
import { appleSignInAvailable, obtainAppleIdToken } from "../src/lib/appleAuth.ts";
import {
  googleAuthConfigured,
  resolveGoogleClientIds,
  useGoogleIdToken,
} from "../src/lib/googleAuth.ts";

export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { session, loginWithPassword, finishOAuth, claimOAuthHandle } = useAuth();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [oauthHandle, setOauthHandle] = useState("");
  const [claimedHandle, setClaimedHandle] = useState<string | null>(null);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [busyProvider, setBusyProvider] = useState<OAuthProviderId | null>(null);
  const [appleDeviceOk, setAppleDeviceOk] = useState(false);

  const mode = session?.mode;
  const multi = mode === "multi";
  const googleIds = useMemo(
    () => resolveGoogleClientIds(session?.oauthProviders?.google?.clientId),
    [session?.oauthProviders?.google?.clientId],
  );
  const googleReady = multi && googleAuthConfigured(googleIds);
  const appleConfigured = multi && Boolean(session?.oauthProviders?.apple?.clientId);
  const appleReady = appleConfigured && appleDeviceOk;
  const showOauth = googleReady || appleReady;
  const oauthHandleValid = HANDLE_PATTERN.test(oauthHandle);

  const bottomPad = Math.max(insets.bottom, 20);

  useEffect(() => {
    if (!appleConfigured) {
      setAppleDeviceOk(false);
      return;
    }
    void appleSignInAvailable().then(setAppleDeviceOk);
  }, [appleConfigured]);

  const finishWithToken = useCallback(
    async (provider: OAuthProviderId, idToken: string, nonce?: string) => {
      setOauthBusy(true);
      setBusyProvider(provider);
      setError(null);
      try {
        const result = await finishOAuth({
          provider,
          idToken,
          ...(nonce !== undefined ? { nonce } : {}),
        });
        if (result.status === "needs_handle") setPendingToken(result.pendingToken);
        else router.replace("/(tabs)/watch");
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "oauth_failed",
        );
      } finally {
        setOauthBusy(false);
        setBusyProvider(null);
      }
    },
    [finishOAuth],
  );

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await loginWithPassword(handle.trim(), password);
      router.replace("/(tabs)/watch");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "login_failed",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onOauthClaim() {
    if (!pendingToken) return;
    setBusy(true);
    setError(null);
    try {
      const next = await claimOAuthHandle(pendingToken, oauthHandle.trim());
      setPendingToken(null);
      setClaimedHandle(next);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "claim_failed",
      );
    } finally {
      setBusy(false);
    }
  }

  if (claimedHandle) {
    return (
      <AuthSheet bottomPad={bottomPad}>
        <View className="gap-4">
          <PageTitle>{t("auth.claim.successTitle")}</PageTitle>
          <Text className="font-sans text-sm leading-relaxed text-muted">
            {t("auth.oauth.backupReminder")}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/(tabs)/watch")}
            className={AUTH_PRIMARY_BTN}
          >
            <Text className="font-sans text-xs font-semibold uppercase tracking-widest text-void">
              {t("auth.claim.continue")}
            </Text>
          </Pressable>
        </View>
      </AuthSheet>
    );
  }

  if (pendingToken) {
    return (
      <AuthSheet bottomPad={bottomPad} keyboard>
        <View className="gap-4">
          <PageTitle>{t("auth.oauth.pickHandle")}</PageTitle>
          <View>
            <Text className={AUTH_LABEL_CLASS}>{t("auth.handle")}</Text>
            <AuthTextInput
              value={oauthHandle}
              onChangeText={(raw) => setOauthHandle(sanitizeHandleInput(raw))}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              // Claim-style handle — not an email (nickname avoids mail QuickType).
              autoComplete="nickname"
              textContentType="nickname"
              keyboardType="ascii-capable"
              placeholder="yourhandle"
            />
            {oauthHandle.length > 0 && !oauthHandleValid ? (
              <Text className="mt-1.5 font-sans text-xs text-red-400">
                {t("auth.claim.handleHint")}
              </Text>
            ) : null}
          </View>
          {error ? <Text className="font-sans text-xs text-red-400">{error}</Text> : null}
          <View className="gap-2">
            <Pressable
              accessibilityRole="button"
              disabled={busy || !oauthHandleValid}
              onPress={() => {
                void onOauthClaim();
              }}
              className={AUTH_PRIMARY_BTN}
            >
              {busy ? (
                <ActivityIndicator color="#080808" />
              ) : (
                <Text className="font-sans text-xs font-semibold uppercase tracking-widest text-void">
                  {t("auth.oauth.finish")}
                </Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setPendingToken(null);
                setError(null);
              }}
              className={AUTH_OUTLINE_BTN}
            >
              <Text className="font-sans text-xs font-semibold uppercase tracking-widest text-muted">
                {t("search.cancel")}
              </Text>
            </Pressable>
          </View>
        </View>
      </AuthSheet>
    );
  }

  return (
    <AuthSheet bottomPad={bottomPad} keyboard>
      <View className="gap-4">
        <PageTitle>{t("auth.login")}</PageTitle>

        <View className="gap-3">
          {multi ? (
            <View>
              <Text className={AUTH_LABEL_CLASS}>{t("auth.handle")}</Text>
              <AuthTextInput
                value={handle}
                onChangeText={(raw) => setHandle(sanitizeHandleInput(raw))}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                // Keep username for saved-password fill; sanitize blocks @/email paste.
                autoComplete="username"
                textContentType="username"
                keyboardType="ascii-capable"
                placeholder="yourhandle"
              />
            </View>
          ) : null}
          <View>
            <Text className={AUTH_LABEL_CLASS}>{t("auth.password")}</Text>
            <AuthTextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              placeholder="••••••••"
            />
          </View>
        </View>

        {error ? <Text className="font-sans text-xs text-red-400">{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={busy || !password || (multi && !handle.trim())}
          onPress={() => {
            void onSubmit();
          }}
          className={AUTH_PRIMARY_BTN}
        >
          {busy ? (
            <ActivityIndicator color="#080808" />
          ) : (
            <Text className="font-sans text-xs font-semibold uppercase tracking-widest text-void">
              {t("auth.login")}
            </Text>
          )}
        </Pressable>

        {showOauth ? (
          <View className="gap-2">
            <View className="flex-row items-center gap-3">
              <View className="h-px flex-1 bg-white/15" />
              <Text className="font-sans text-[10px] uppercase tracking-widest text-muted">
                {t("auth.oauth.or")}
              </Text>
              <View className="h-px flex-1 bg-white/15" />
            </View>
            {googleReady ? (
              <GoogleButton
                ids={googleIds}
                label={t("auth.oauth.google")}
                busy={oauthBusy}
                busyProvider={busyProvider}
                setBusyProvider={setBusyProvider}
                onBusy={setOauthBusy}
                onError={setError}
                onIdToken={(idToken) => finishWithToken("google", idToken)}
              />
            ) : null}
            {appleReady ? (
              <OAuthButtons
                providers={[
                  { id: "apple", label: t("auth.oauth.apple"), available: !oauthBusy },
                ]}
                busyProvider={busyProvider === "apple" ? "apple" : null}
                onPress={() => {
                  setError(null);
                  void (async () => {
                    try {
                      const { idToken, nonce } = await obtainAppleIdToken();
                      await finishWithToken("apple", idToken, nonce);
                    } catch (err) {
                      const code =
                        err && typeof err === "object" && "code" in err
                          ? String((err as { code: unknown }).code)
                          : "";
                      if (code === "ERR_REQUEST_CANCELED") return;
                      setError(err instanceof Error ? err.message : "apple_oauth_failed");
                      setOauthBusy(false);
                      setBusyProvider(null);
                    }
                  })();
                }}
              />
            ) : null}
          </View>
        ) : null}

        {multi ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              if (error && handle.trim() && password) {
                stashClaimPrefill({ handle: handle.trim(), password });
              }
              router.push("/claim");
            }}
            className={AUTH_TEXT_LINK}
          >
            <Text className="px-3 text-center font-sans text-sm font-semibold text-yellow">
              {t("auth.needAccount")}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </AuthSheet>
  );
}

function GoogleButton({
  ids,
  label,
  busy,
  busyProvider,
  setBusyProvider,
  onBusy,
  onError,
  onIdToken,
}: {
  ids: ReturnType<typeof resolveGoogleClientIds>;
  label: string;
  busy: boolean;
  busyProvider: OAuthProviderId | null;
  setBusyProvider: (p: OAuthProviderId | null) => void;
  onBusy: (v: boolean) => void;
  onError: (msg: string | null) => void;
  onIdToken: (idToken: string) => void | Promise<void>;
}) {
  const { ready, prompt } = useGoogleIdToken({
    ids,
    onIdToken,
    onError: (msg) => {
      onBusy(false);
      setBusyProvider(null);
      onError(msg);
    },
    onCancel: () => {
      onBusy(false);
      setBusyProvider(null);
    },
  });

  return (
    <OAuthButtons
      providers={[{ id: "google", label, available: ready && !busy }]}
      busyProvider={busyProvider === "google" ? "google" : null}
      onPress={() => {
        onError(null);
        setBusyProvider("google");
        void prompt();
      }}
    />
  );
}
