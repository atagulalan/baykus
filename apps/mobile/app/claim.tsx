import { ApiError, claim } from "@baykus/api-client";
import { PageTitle } from "@baykus/ui";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Keyboard, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AUTH_LABEL_CLASS,
  AUTH_PRIMARY_BTN,
  AuthSheet,
  AuthTextInput,
} from "../src/auth/AuthSheet.tsx";
import { useAuth } from "../src/auth/AuthProvider.tsx";
import { takeClaimPrefill } from "../src/auth/claimPrefill.ts";
import { HANDLE_PATTERN, sanitizeHandleInput } from "../src/auth/handleInput.ts";
import { setAccessToken } from "../src/lib/session.ts";

function goBackToLogin() {
  Keyboard.dismiss();
  if (router.canGoBack()) router.back();
  else router.replace("/login");
}

function readClaimPrefill() {
  const prefill = takeClaimPrefill();
  if (!prefill) return { handle: "", password: "" };
  return {
    handle: sanitizeHandleInput(prefill.handle),
    password: prefill.password,
  };
}

export default function ClaimScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { refresh, session } = useAuth();
  const initial = useRef(readClaimPrefill()).current;

  const [handle, setHandle] = useState(initial.handle);
  const [password, setPassword] = useState(initial.password);
  const [confirm, setConfirm] = useState(initial.password ? initial.password : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const handleValid = HANDLE_PATTERN.test(handle);
  const passwordValid = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirm;
  const bottomPad = Math.max(insets.bottom, 20);

  if (session?.mode === "multi" && session.authenticated) {
    return (
      <AuthSheet bottomPad={bottomPad}>
        <View className="gap-4">
          <PageTitle>{t("auth.claim.title")}</PageTitle>
          <Text className="font-sans text-sm text-muted">
            Signed in as @{session.handle ?? "library"}.
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

  if (done) {
    return (
      <AuthSheet bottomPad={bottomPad}>
        <View className="gap-4">
          <PageTitle>{t("auth.claim.successTitle")}</PageTitle>
          <Text className="font-sans text-sm leading-relaxed text-muted">
            {t("auth.claim.successBody")}
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

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      const result = await claim({ handle, password, returnToken: true });
      if (result.token) await setAccessToken(result.token);
      await refresh();
      setDone(result.handle);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "claim_failed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSheet bottomPad={bottomPad} keyboard onBack={goBackToLogin}>
      <View className="gap-4">
        <PageTitle>{t("auth.claim.title")}</PageTitle>

        <View className="gap-3">
          <View>
            <Text className={AUTH_LABEL_CLASS}>{t("auth.handle")}</Text>
            <AuthTextInput
              value={handle}
              onChangeText={(raw) => setHandle(sanitizeHandleInput(raw))}
              autoCapitalize="none"
              autoComplete="username"
              textContentType="username"
              keyboardType="ascii-capable"
              autoCorrect={false}
              spellCheck={false}
              placeholder="yourhandle"
            />
            {!handleValid && handle.length > 0 ? (
              <Text className="mt-1.5 font-sans text-xs text-red-400">
                {t("auth.claim.handleHint")}
              </Text>
            ) : null}
          </View>

          <View>
            <Text className={AUTH_LABEL_CLASS}>{t("auth.password")}</Text>
            <AuthTextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              autoCorrect={false}
              spellCheck={false}
            />
            {password.length > 0 && !passwordValid ? (
              <Text className="mt-1.5 font-sans text-xs text-red-400">
                {t("auth.claim.passwordHint")}
              </Text>
            ) : null}
          </View>

          <View>
            <Text className={AUTH_LABEL_CLASS}>{t("auth.claim.confirmPassword")}</Text>
            <AuthTextInput
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              // Single newPassword field — a second one breaks Fill on RN.
              autoComplete="password"
              textContentType="password"
              autoCorrect={false}
              spellCheck={false}
            />
            {!passwordsMatch && confirm.length > 0 ? (
              <Text className="mt-1.5 font-sans text-xs text-red-400">
                {t("auth.claim.passwordMismatch")}
              </Text>
            ) : null}
          </View>
        </View>

        {error ? <Text className="font-sans text-xs text-red-400">{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={busy || !handleValid || !passwordValid || !passwordsMatch}
          onPress={() => {
            void onSubmit();
          }}
          className={AUTH_PRIMARY_BTN}
        >
          {busy ? (
            <ActivityIndicator color="#080808" />
          ) : (
            <Text className="font-sans text-xs font-semibold uppercase tracking-widest text-void">
              {t("auth.claim.submit")}
            </Text>
          )}
        </Pressable>
      </View>
    </AuthSheet>
  );
}
