import { ApiError } from "@baykus/api-client";
import { OAuthButtons, type OAuthProviderId, PageTitle } from "@baykus/ui";
import { Link, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../src/auth/AuthProvider.tsx";
import { appleSignInAvailable, obtainAppleIdToken } from "../src/lib/appleAuth.ts";
import {
  googleAuthConfigured,
  resolveGoogleClientIds,
  useGoogleIdToken,
} from "../src/lib/googleAuth.ts";

const HANDLE_PATTERN = /^[a-z0-9-]{3,30}$/;

export default function LoginScreen() {
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
      router.back();
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
      <View className="flex-1 bg-void px-5 pt-6">
        <PageTitle className="mb-4">Welcome, {claimedHandle}</PageTitle>
        <Text className="mb-6 text-sm text-muted">
          Account created via OAuth. Export a zip backup when you can — OAuth-only accounts have no
          password recovery.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)/watch")}
          className="h-11 items-center justify-center rounded-full bg-yellow"
        >
          <Text className="font-mono text-xs uppercase tracking-widest text-void">Continue</Text>
        </Pressable>
      </View>
    );
  }

  if (pendingToken) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-void px-5 pt-6"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <PageTitle className="mb-6">Pick a handle</PageTitle>
        <Text className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          Handle
        </Text>
        <TextInput
          value={oauthHandle}
          onChangeText={setOauthHandle}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="yourhandle"
          placeholderTextColor="#888888"
          className="mb-2 h-11 rounded-lg border border-white/15 px-3 font-mono text-sm text-snow"
        />
        {oauthHandle.length > 0 && !oauthHandleValid ? (
          <Text className="mb-2 font-mono text-[10px] text-red-400">
            3–30 chars: a-z, 0-9, hyphen
          </Text>
        ) : null}
        {error ? <Text className="mb-3 font-mono text-xs text-red-400">{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={busy || !oauthHandleValid}
          onPress={() => {
            void onOauthClaim();
          }}
          className="h-11 items-center justify-center rounded-full bg-yellow disabled:opacity-40"
        >
          {busy ? (
            <ActivityIndicator color="#080808" />
          ) : (
            <Text className="font-mono text-xs uppercase tracking-widest text-void">Finish</Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setPendingToken(null);
            setError(null);
          }}
          className="mt-3 h-11 items-center justify-center rounded-full border border-white/15"
        >
          <Text className="font-mono text-xs uppercase tracking-widest text-muted">Cancel</Text>
        </Pressable>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-void px-5 pt-6"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PageTitle className="mb-6">Sign in</PageTitle>
      {multi ? (
        <>
          <Text className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            Handle
          </Text>
          <TextInput
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="yourhandle"
            placeholderTextColor="#888888"
            className="mb-4 h-11 rounded-lg border border-white/15 px-3 font-mono text-sm text-snow"
          />
        </>
      ) : null}
      <Text className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
        Password
      </Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
        placeholderTextColor="#888888"
        className="mb-4 h-11 rounded-lg border border-white/15 px-3 font-mono text-sm text-snow"
      />
      {error ? <Text className="mb-3 font-mono text-xs text-red-400">{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={busy || !password || (multi && !handle.trim())}
        onPress={() => {
          void onSubmit();
        }}
        className="h-11 items-center justify-center rounded-full bg-yellow disabled:opacity-40"
      >
        {busy ? (
          <ActivityIndicator color="#080808" />
        ) : (
          <Text className="font-mono text-xs uppercase tracking-widest text-void">Continue</Text>
        )}
      </Pressable>

      {showOauth ? (
        <View className="mt-6 gap-3">
          <View className="flex-row items-center gap-2">
            <View className="h-px flex-1 bg-white/10" />
            <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">or</Text>
            <View className="h-px flex-1 bg-white/10" />
          </View>
          {googleReady ? (
            <GoogleButton
              ids={googleIds}
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
              providers={[{ id: "apple", label: "Continue with Apple", available: !oauthBusy }]}
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
        <Link href="/claim" asChild>
          <Pressable accessibilityRole="link" className="mt-6 items-center py-2">
            <Text className="font-mono text-xs text-muted underline">Need an account?</Text>
          </Pressable>
        </Link>
      ) : null}

      <Text className="mt-4 font-mono text-[10px] text-muted">
        Uses returnToken + SecureStore key baykus.accessToken (014).
      </Text>
    </KeyboardAvoidingView>
  );
}

function GoogleButton({
  ids,
  busy,
  busyProvider,
  setBusyProvider,
  onBusy,
  onError,
  onIdToken,
}: {
  ids: ReturnType<typeof resolveGoogleClientIds>;
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
      providers={[{ id: "google", label: "Continue with Google", available: ready && !busy }]}
      busyProvider={busyProvider === "google" ? "google" : null}
      onPress={() => {
        onError(null);
        setBusyProvider("google");
        void prompt();
      }}
    />
  );
}
