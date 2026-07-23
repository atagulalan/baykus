import {
  ApiError,
  deleteAccount,
  type OAuthProvider,
  oauthLink,
  oauthUnlink,
} from "@baykus/api-client";
import { OAuthButtons } from "@baykus/ui";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { useAuth } from "../auth/AuthProvider.tsx";
import { appleSignInAvailable, obtainAppleIdToken } from "./appleAuth.ts";
import { googleAuthConfigured, resolveGoogleClientIds, useGoogleIdToken } from "./googleAuth.ts";
import { clearAccessToken } from "./session.ts";

/**
 * Multi-mode account hygiene: link/unlink OAuth + delete account (014).
 * Mount when `session.mode === "multi" && session.authenticated`.
 */
export function AccountSection() {
  const { session, refresh, signOut } = useAuth();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [appleOk, setAppleOk] = useState(false);

  const identities = session?.identities ?? [];
  const providers = session?.oauthProviders ?? {};
  const hasPassword = session?.hasPassword ?? false;
  const googleIds = useMemo(
    () => resolveGoogleClientIds(providers.google?.clientId),
    [providers.google?.clientId],
  );
  const googleConfigured = Boolean(providers.google) && googleAuthConfigured(googleIds);
  const appleConfigured = Boolean(providers.apple);

  useEffect(() => {
    if (!appleConfigured) {
      setAppleOk(false);
      return;
    }
    void appleSignInAvailable().then(setAppleOk);
  }, [appleConfigured]);

  const finishLink = useCallback(
    async (provider: OAuthProvider, idToken: string, nonce?: string) => {
      setBusy(true);
      setError(null);
      try {
        await oauthLink({
          provider,
          idToken,
          ...(nonce !== undefined ? { nonce } : {}),
        });
        await refresh();
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "link_failed",
        );
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  async function unlink(provider: OAuthProvider) {
    setBusy(true);
    setError(null);
    try {
      await oauthUnlink(provider);
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "unlink_failed",
      );
    } finally {
      setBusy(false);
    }
  }

  async function afterDeleted() {
    await clearAccessToken();
    await signOut();
    setDeleteOpen(false);
    router.replace("/login");
  }

  return (
    <View className="mb-6 gap-2 px-1">
      <Text className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
        Account
      </Text>
      <Text className="font-mono text-[10px] text-muted">
        Identities: {identities.length ? identities.join(", ") : "none"}
        {hasPassword ? " · password" : " · OAuth-only"}
      </Text>
      {error ? <Text className="font-mono text-xs text-red-400">{error}</Text> : null}

      {identities.map((provider) => (
        <Pressable
          key={provider}
          accessibilityRole="button"
          disabled={busy || (identities.length === 1 && !hasPassword)}
          onPress={() => {
            void unlink(provider);
          }}
          className="rounded-xl border border-white/10 px-3 py-3 active:bg-white/5 disabled:opacity-40"
        >
          <Text className="font-mono text-xs uppercase tracking-widest text-muted">
            Unlink {provider}
          </Text>
        </Pressable>
      ))}

      {googleConfigured && !identities.includes("google") ? (
        <GoogleTokenButton
          ids={googleIds}
          label="Link Google"
          busy={busy}
          onBusy={setBusy}
          onError={setError}
          onIdToken={(idToken) => finishLink("google", idToken)}
        />
      ) : null}

      {appleConfigured && appleOk && !identities.includes("apple") ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            void (async () => {
              try {
                const { idToken, nonce } = await obtainAppleIdToken();
                await finishLink("apple", idToken, nonce);
              } catch (err) {
                const code =
                  err && typeof err === "object" && "code" in err
                    ? String((err as { code: unknown }).code)
                    : "";
                if (code === "ERR_REQUEST_CANCELED") return;
                setError(err instanceof Error ? err.message : "apple_link_failed");
              }
            })();
          }}
          className="h-11 items-center justify-center rounded-full border border-white/15 active:bg-white/5 disabled:opacity-40"
        >
          {busy ? (
            <ActivityIndicator color="#ebebeb" />
          ) : (
            <Text className="font-mono text-xs uppercase tracking-widest text-snow">
              Link Apple
            </Text>
          )}
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => {
          void (async () => {
            setBusy(true);
            setError(null);
            try {
              await signOut();
              router.replace("/login");
            } catch (err) {
              setError(
                err instanceof ApiError
                  ? err.message
                  : err instanceof Error
                    ? err.message
                    : "logout_failed",
              );
            } finally {
              setBusy(false);
            }
          })();
        }}
        className="rounded-xl border border-white/10 px-3 py-3 active:bg-white/5 disabled:opacity-40"
      >
        <Text className="font-mono text-xs uppercase tracking-widest text-muted">
          {t("auth.account.logout")}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setDeletePassword("");
          setError(null);
          setDeleteOpen(true);
        }}
        className="rounded-xl border border-red-500/40 px-3 py-3 active:bg-red-500/10"
      >
        <Text className="font-mono text-xs uppercase tracking-widest text-red-400">
          Delete account
        </Text>
      </Pressable>

      {deleteOpen ? (
        <View className="gap-3 rounded-xl border border-red-500/30 bg-[#101010] p-4">
          <Text className="font-display text-lg italic text-snow">Delete account?</Text>
          <Text className="text-sm text-muted">
            Export a zip first. This permanently removes the handle and library.
          </Text>

          {hasPassword ? (
            <>
              <TextInput
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                placeholder="Password"
                placeholderTextColor="#888888"
                className="h-11 rounded-lg border border-white/15 px-3 font-mono text-sm text-snow"
              />
              <View className="flex-row justify-end gap-2">
                <Pressable onPress={() => setDeleteOpen(false)} className="px-3 py-2">
                  <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  disabled={busy || !deletePassword}
                  onPress={() => {
                    void (async () => {
                      setBusy(true);
                      setError(null);
                      try {
                        await deleteAccount({ password: deletePassword });
                        await afterDeleted();
                      } catch (err) {
                        setError(
                          err instanceof ApiError
                            ? err.message
                            : err instanceof Error
                              ? err.message
                              : "delete_failed",
                        );
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                  className="rounded-lg bg-red-600 px-4 py-2.5 disabled:opacity-40"
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="font-mono text-[10px] uppercase tracking-widest text-white">
                      Delete
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {googleConfigured && identities.includes("google") ? (
                <GoogleTokenButton
                  ids={googleIds}
                  label="Confirm with Google"
                  busy={busy}
                  onBusy={setBusy}
                  onError={setError}
                  onIdToken={async (idToken) => {
                    setBusy(true);
                    setError(null);
                    try {
                      await deleteAccount({ provider: "google", idToken });
                      await afterDeleted();
                    } catch (err) {
                      setError(
                        err instanceof ApiError
                          ? err.message
                          : err instanceof Error
                            ? err.message
                            : "delete_failed",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              ) : null}
              {identities.includes("apple") && appleOk ? (
                <Pressable
                  disabled={busy}
                  onPress={() => {
                    void (async () => {
                      setBusy(true);
                      setError(null);
                      try {
                        const { idToken, nonce } = await obtainAppleIdToken();
                        await deleteAccount({ provider: "apple", idToken, nonce });
                        await afterDeleted();
                      } catch (err) {
                        const code =
                          err && typeof err === "object" && "code" in err
                            ? String((err as { code: unknown }).code)
                            : "";
                        if (code !== "ERR_REQUEST_CANCELED") {
                          setError(err instanceof Error ? err.message : "delete_failed");
                        }
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                  className="h-11 items-center justify-center rounded-full border border-white/15"
                >
                  <Text className="font-mono text-xs uppercase tracking-widest text-snow">
                    Confirm with Apple
                  </Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setDeleteOpen(false)} className="items-center py-2">
                <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  Cancel
                </Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

function GoogleTokenButton({
  ids,
  label,
  busy,
  onBusy,
  onError,
  onIdToken,
}: {
  ids: ReturnType<typeof resolveGoogleClientIds>;
  label: string;
  busy: boolean;
  onBusy: (v: boolean) => void;
  onError: (msg: string | null) => void;
  onIdToken: (idToken: string) => void | Promise<void>;
}) {
  const { ready, prompt } = useGoogleIdToken({
    ids,
    onIdToken,
    onError: (msg) => {
      onBusy(false);
      onError(msg);
    },
    onCancel: () => onBusy(false),
  });

  return (
    <OAuthButtons
      providers={[{ id: "google", label, available: ready && !busy }]}
      busyProvider={busy ? "google" : null}
      onPress={() => {
        onError(null);
        void prompt();
      }}
    />
  );
}
