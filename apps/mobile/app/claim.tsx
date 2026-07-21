import { ApiError, claim, importZip } from "@baykus/api-client";
import { PageTitle } from "@baykus/ui";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { setAccessToken } from "../src/lib/session.ts";

const HANDLE_PATTERN = /^[a-z0-9-]{3,30}$/;

export default function ClaimScreen() {
  const { t } = useTranslation();
  const { refresh, session } = useAuth();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [seedName, setSeedName] = useState<string | null>(null);
  const [seedBlob, setSeedBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [seedWarning, setSeedWarning] = useState(false);

  const handleValid = HANDLE_PATTERN.test(handle);
  const passwordsMatch = password.length > 0 && password === confirm;

  if (session?.mode === "multi" && session.authenticated) {
    return (
      <View className="flex-1 bg-void px-5 pt-6">
        <PageTitle className="mb-4">Already claimed</PageTitle>
        <Text className="font-mono text-xs text-muted">
          Signed in as {session.handle ?? "library"}.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)/watch")}
          className="mt-6 h-11 items-center justify-center rounded-full bg-yellow"
        >
          <Text className="font-mono text-xs uppercase tracking-widest text-void">Continue</Text>
        </Pressable>
      </View>
    );
  }

  if (done) {
    return (
      <View className="flex-1 bg-void px-5 pt-6">
        <PageTitle className="mb-4">Welcome, {done}</PageTitle>
        <Text className="mb-4 text-sm text-muted">
          Handle claimed. Session token stored in SecureStore.
        </Text>
        {seedWarning ? (
          <Text className="mb-4 font-mono text-xs text-yellow">
            {t("auth.claim.seedImportFailed")}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)/watch")}
          className="h-11 items-center justify-center rounded-full bg-yellow"
        >
          <Text className="font-mono text-xs uppercase tracking-widest text-void">
            Open library
          </Text>
        </Pressable>
      </View>
    );
  }

  async function pickSeed() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["application/zip"],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    const res = await fetch(asset.uri);
    setSeedBlob(await res.blob());
    setSeedName(asset.name ?? "backup.zip");
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    setSeedWarning(false);
    try {
      const result = await claim({ handle, password, returnToken: true });
      if (result.token) await setAccessToken(result.token);
      await refresh();
      if (seedBlob) {
        try {
          await importZip(seedBlob, "replace");
        } catch {
          setSeedWarning(true);
        }
      }
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
    <KeyboardAvoidingView
      className="flex-1 bg-void px-5 pt-6"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PageTitle className="mb-6">Claim handle</PageTitle>
      <Field label="Handle" value={handle} onChangeText={setHandle} autoCapitalize="none" />
      {!handleValid && handle.length > 0 ? (
        <Text className="mb-2 font-mono text-[10px] text-red-400">
          3–30 chars: a-z, 0-9, hyphen
        </Text>
      ) : null}
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Field label="Confirm" value={confirm} onChangeText={setConfirm} secureTextEntry />
      {!passwordsMatch && confirm.length > 0 ? (
        <Text className="mb-2 font-mono text-[10px] text-red-400">Passwords must match</Text>
      ) : null}

      <Text className="mb-2 mt-2 font-mono text-[10px] uppercase tracking-widest text-muted">
        {t("auth.claim.seedZip")}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void pickSeed();
        }}
        className="mb-4 h-11 items-center justify-center rounded-full border border-white/15"
      >
        <Text className="font-mono text-xs uppercase tracking-widest text-snow">
          {seedName ?? t("auth.claim.seedZip")}
        </Text>
      </Pressable>
      {seedName ? (
        <Pressable
          onPress={() => {
            setSeedBlob(null);
            setSeedName(null);
          }}
          className="mb-3"
        >
          <Text className="font-mono text-[10px] text-muted underline">Clear seed zip</Text>
        </Pressable>
      ) : null}

      {error ? <Text className="mb-3 font-mono text-xs text-red-400">{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={busy || !handleValid || !passwordsMatch}
        onPress={() => {
          void onSubmit();
        }}
        className="mt-2 h-11 items-center justify-center rounded-full bg-yellow disabled:opacity-40"
      >
        {busy ? (
          <ActivityIndicator color="#080808" />
        ) : (
          <Text className="font-mono text-xs uppercase tracking-widest text-void">Claim</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View className="mb-3">
      <Text className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholderTextColor="#888888"
        className="h-11 rounded-lg border border-white/15 px-3 font-mono text-sm text-snow"
      />
    </View>
  );
}
