import {
  ApiError,
  type DefaultStartPage,
  type EpisodeLabelFormat,
  getSettings,
  type Locale,
  type NewSeriesDefaultStatus,
  refreshAllSeries,
  resetLibrary,
  type Settings,
  updateSettings,
} from "@baykus/api-client";
import {
  Checkbox,
  EmptyPanel,
  PullToRefresh,
  SectionPill,
  SettingsSelect,
  SkeletonSettingsSections,
} from "@baykus/ui";
import { Link } from "expo-router";
import { Settings as SettingsIcon } from "lucide-react-native";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";
import { tabContentBottom, tabContentTop } from "../../src/chrome/layout.ts";
import { AccountSection } from "../../src/lib/AccountSection.tsx";
import { exportLibraryZip } from "../../src/lib/exportZip.ts";
import { resolveUiPrefs } from "../../src/lib/uiPrefs.ts";

const LOCALES: Locale[] = ["tr", "en", "ja"];
const REGIONS = ["TR", "US", "GB", "DE", "FR", "ES", "IT", "NL"] as const;

/** Visual parity with web SettingsPage — SectionPill groups, soft rows, no card shells. */
export default function SettingsScreen() {
  const { session, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetChecked, setResetChecked] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [metaBusy, setMetaBusy] = useState(false);
  const [metaProgress, setMetaProgress] = useState<string | null>(null);

  const needsAuth = session?.mode === "multi" && !session.authenticated;
  const confirmPhrase = t("settings.dangerZone.confirmPhrase");
  const canReset = resetChecked && resetPhrase === confirmPhrase;

  const load = useCallback(async () => {
    if (needsAuth) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const s = await getSettings();
      setSettings(s);
      if (s.locale === "en" || s.locale === "tr" || s.locale === "ja") {
        if (i18n.language !== s.locale) await i18n.changeLanguage(s.locale);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "load_failed",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [needsAuth, i18n]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void load();
  }, [authLoading, load]);

  async function patch(partial: Parameters<typeof updateSettings>[0]) {
    setSaving(true);
    setError(null);
    try {
      const next = await updateSettings(partial);
      setSettings(next);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "save_failed",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onLocaleChange(locale: Locale) {
    await i18n.changeLanguage(locale);
    await patch({ locale });
  }

  async function onResetLibrary() {
    if (!canReset) return;
    setResetBusy(true);
    setError(null);
    try {
      await resetLibrary();
      setResetOpen(false);
      setResetChecked(false);
      setResetPhrase("");
      setLoading(true);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "reset_failed",
      );
    } finally {
      setResetBusy(false);
    }
  }

  if (authLoading || loading) {
    return (
      <View className="flex-1 bg-void px-3" style={{ paddingTop: tabContentTop(insets.top) }}>
        <SkeletonSettingsSections sections={3} />
      </View>
    );
  }

  if (needsAuth) {
    return (
      <View className="flex-1 justify-center bg-void px-2">
        <EmptyPanel
          icon={SettingsIcon}
          title="Sign in"
          hint="Settings need a multi-mode session."
          action={
            <Link href="/login" asChild>
              <Pressable className="min-h-10 items-center justify-center rounded-full bg-yellow px-5 py-2.5">
                <Text className="font-mono text-xs uppercase tracking-widest text-void">
                  Sign in
                </Text>
              </Pressable>
            </Link>
          }
        />
      </View>
    );
  }

  if (!settings) {
    return (
      <View className="flex-1 items-center justify-center bg-void px-4">
        <Text className="font-mono text-xs text-red-400">{error ?? "settings_unavailable"}</Text>
        <Pressable
          className="mt-3 rounded-full border border-white/15 px-4 py-2"
          onPress={() => {
            setLoading(true);
            void load();
          }}
        >
          <Text className="font-mono text-[10px] uppercase tracking-widest text-snow">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const prefs = resolveUiPrefs(settings);
  const twoCol = width >= 640;
  /** Half-width column cell; mirrors web `sm:columns-2` gap-6. */
  const colStyle = twoCol ? ({ width: "48%" } as const) : undefined;

  return (
    <PullToRefresh
      className="flex-1 bg-void"
      contentContainerStyle={{
        paddingBottom: tabContentBottom(insets.bottom),
        paddingTop: tabContentTop(insets.top),
        paddingHorizontal: 12,
      }}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
      }}
    >
      {saving || savedFlash ? (
        <View className="mb-4 flex-row items-center justify-end gap-2 px-1">
          {saving ? <ActivityIndicator color="#ebebeb" /> : null}
          {savedFlash ? (
            <Text className="font-mono text-[10px] uppercase tracking-widest text-yellow">
              {t("settings.saved")}
            </Text>
          ) : null}
        </View>
      ) : null}
      {error ? <Text className="mb-3 px-1 font-mono text-xs text-red-400">{error}</Text> : null}

      <View className={twoCol ? "flex-row flex-wrap justify-between gap-y-2" : undefined}>
        <View style={colStyle}>
          <SettingsGroup title={t("settings.general.title")}>
            <SettingsSelect
              label={t("settings.general.locale")}
              value={settings.locale}
              options={LOCALES.map((l) => ({
                value: l,
                label: t(`settings.general.localeName.${l}`),
              }))}
              onChange={(val) => {
                void onLocaleChange(val);
              }}
            />
            <SettingsSelect
              label={t("settings.general.region")}
              value={settings.region}
              options={REGIONS.map((r) => ({
                value: r,
                label: t(`settings.general.regionName.${r}`),
              }))}
              onChange={(val) => {
                void patch({ region: val });
              }}
            />
            <SettingsSelect
              label={t("settings.general.episodeLabelFormat")}
              value={settings.episodeLabelFormat}
              options={[
                { value: "SxEy" as EpisodeLabelFormat, label: "S1E6" },
                { value: "S01E06" as EpisodeLabelFormat, label: "S01E06" },
                { value: "compact" as EpisodeLabelFormat, label: "1×6" },
              ]}
              onChange={(val) => {
                void patch({ episodeLabelFormat: val });
              }}
            />
            <SettingsSelect
              label={t("settings.general.watchingWindow")}
              hint={t("settings.general.watchingWindowHint")}
              value={String(settings.watchingWindowDays)}
              options={["7", "14", "30", "60", "90", "180", "365"].map((d) => ({
                value: d,
                label: t(`settings.general.watchingWindowOptions.${d}`),
              }))}
              onChange={(val) => {
                void patch({ watchingWindowDays: Number(val) });
              }}
            />
            <SettingsSelect
              label={t("settings.general.defaultStartPage")}
              value={settings.defaultStartPage}
              options={[
                {
                  value: "home" as DefaultStartPage,
                  label: t("settings.general.defaultStartPageName.home"),
                },
                {
                  value: "calendar" as DefaultStartPage,
                  label: t("settings.general.defaultStartPageName.calendar"),
                },
                {
                  value: "stats" as DefaultStartPage,
                  label: t("settings.general.defaultStartPageName.stats"),
                },
              ]}
              onChange={(val) => {
                void patch({ defaultStartPage: val });
              }}
            />
            <SettingsSelect
              label={t("settings.general.newSeriesDefaultStatus")}
              value={settings.newSeriesDefaultStatus}
              options={[
                {
                  value: "watching" as NewSeriesDefaultStatus,
                  label: t("settings.general.newSeriesDefaultStatusName.watching"),
                },
                {
                  value: "watchlist" as NewSeriesDefaultStatus,
                  label: t("settings.general.newSeriesDefaultStatusName.watchlist"),
                },
              ]}
              onChange={(val) => {
                void patch({ newSeriesDefaultStatus: val });
              }}
            />
            <CheckboxRow
              label={t("settings.general.spoilerProtection")}
              hint={t("settings.general.spoilerProtectionHint")}
              checked={settings.spoilerProtection}
              onChange={(checked) => {
                void patch({ spoilerProtection: checked });
              }}
            />
            <CheckboxRow
              label={t("settings.general.showNextUpCarousel")}
              hint={t("settings.general.showNextUpCarouselHint")}
              checked={prefs.showNextUpCarousel}
              onChange={(checked) => {
                void patch({
                  uiPrefs: { ...prefs, showNextUpCarousel: checked },
                });
              }}
            />
            <SettingsSelect
              label={t("settings.general.theme")}
              value="dark"
              options={[{ value: "dark", label: t("settings.general.themeDark") }]}
              onChange={() => {}}
            />
          </SettingsGroup>
        </View>

        <View style={colStyle}>
          <SettingsGroup title={t("settings.data.title")}>
            <View className="flex-col gap-4">
              <Pressable
                accessibilityRole="button"
                disabled={exportBusy}
                onPress={() => {
                  void (async () => {
                    setExportBusy(true);
                    setError(null);
                    try {
                      await exportLibraryZip(false);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "export_failed");
                    } finally {
                      setExportBusy(false);
                    }
                  })();
                }}
                className="self-start rounded-full border border-white/10 px-4 py-2.5 active:border-white/20 disabled:opacity-40"
              >
                {exportBusy ? (
                  <ActivityIndicator color="#888" />
                ) : (
                  <Text className="font-sans text-sm text-snow">{t("settings.data.export")}</Text>
                )}
              </Pressable>

              <View className="flex-col gap-2">
                <Text className="font-sans text-sm text-snow">
                  {t("settings.data.importTitle")}
                </Text>
                <Link href="/import" asChild>
                  <Pressable
                    accessibilityRole="button"
                    className="items-center rounded-xl border border-dashed border-white/10 px-4 py-8 active:border-white/20 active:bg-white/[0.02]"
                  >
                    <Text className="font-sans text-sm text-muted">
                      {t("settings.data.chooseFile")}
                    </Text>
                    <Text className="mt-1.5 font-sans text-xs text-muted/50">.zip</Text>
                  </Pressable>
                </Link>
              </View>

              <Link href="/import" asChild>
                <Pressable
                  accessibilityRole="button"
                  className="self-start rounded-full border border-white/10 px-4 py-2.5 active:border-white/20"
                >
                  <Text className="font-sans text-sm text-snow">
                    {t("settings.data.tvtimeImport")}
                  </Text>
                </Pressable>
              </Link>

              <Pressable
                accessibilityRole="button"
                disabled={metaBusy}
                onPress={() => {
                  void (async () => {
                    setMetaBusy(true);
                    setMetaProgress(null);
                    setError(null);
                    try {
                      const result = await refreshAllSeries((e) => {
                        setMetaProgress(`${e.done}/${e.total}`);
                      });
                      setMetaProgress(
                        t("library.refreshAllDone", {
                          newEpisodes: result.newEpisodes,
                          defaultValue: `+${result.newEpisodes} episodes`,
                        }),
                      );
                    } catch (err) {
                      setError(
                        err instanceof ApiError
                          ? err.message
                          : err instanceof Error
                            ? err.message
                            : "refresh_failed",
                      );
                    } finally {
                      setMetaBusy(false);
                    }
                  })();
                }}
                className="w-full items-center rounded-full border border-white/10 px-4 py-2.5 active:border-white/20 disabled:opacity-40"
              >
                <Text className="font-sans text-sm text-snow">
                  {metaProgress ?? t("library.refreshAll")}
                </Text>
              </Pressable>
            </View>
          </SettingsGroup>
        </View>

        {session?.mode === "multi" && session.authenticated ? (
          <View style={colStyle} className="mb-10">
            <AccountSection />
          </View>
        ) : null}
      </View>

      {/* Extra spacer before Danger so Data→Danger gap matches section rhythm. */}
      <View className="mt-6">
        <SettingsGroup title={t("settings.dangerZone.title")} danger>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setResetOpen((v) => !v);
              setResetChecked(false);
              setResetPhrase("");
            }}
            className="rounded-xl px-3 py-3 active:bg-white/[0.04]"
          >
            <Text className="font-mono text-xs uppercase tracking-widest text-red-400">
              {t("settings.dangerZone.button")}
            </Text>
          </Pressable>
          {resetOpen ? (
            <View className="gap-3 rounded-xl px-3 py-3">
              <Text className="font-display text-lg italic text-red-400">
                {t("settings.dangerZone.warningTitle")}
              </Text>
              <Text className="text-sm text-snow">{t("settings.dangerZone.warningDesc")}</Text>
              <View className="flex-row items-start gap-3">
                <Checkbox
                  checked={resetChecked}
                  onChange={setResetChecked}
                  accessibilityLabel={t("settings.dangerZone.confirmCheckbox")}
                />
                <Pressable className="flex-1" onPress={() => setResetChecked((v) => !v)}>
                  <Text className="text-sm text-snow">
                    {t("settings.dangerZone.confirmCheckbox")}
                  </Text>
                </Pressable>
              </View>
              <Text className="text-sm text-muted">Type {confirmPhrase} to confirm</Text>
              <TextInput
                value={resetPhrase}
                onChangeText={setResetPhrase}
                editable={resetChecked}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder={confirmPhrase}
                placeholderTextColor="#888888"
                className="h-11 rounded-lg border border-white/15 px-3 font-mono text-sm text-snow disabled:opacity-40"
              />
              <View className="flex-row justify-end gap-2">
                <Pressable onPress={() => setResetOpen(false)} className="rounded-full px-3.5 py-2">
                  <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  disabled={!canReset || resetBusy}
                  onPress={() => {
                    void onResetLibrary();
                  }}
                  className="rounded-full bg-red-600 px-3.5 py-2 disabled:opacity-40"
                >
                  {resetBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="font-mono text-[10px] uppercase tracking-widest text-white">
                      {t("settings.dangerZone.confirm")}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : null}
        </SettingsGroup>
      </View>
    </PullToRefresh>
  );
}

function SettingsGroup({
  title,
  children,
  danger,
}: {
  title: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <View className="mb-10 flex-col gap-3">
      <View className="z-30 items-center px-3 py-1">
        <SectionPill className={danger ? "border-red-900/40" : undefined}>
          <Text
            className={`px-2.5 py-1 font-sans text-sm font-semibold ${danger ? "text-red-400" : "text-snow"}`}
          >
            {title}
          </Text>
        </SectionPill>
      </View>
      <View className="flex-col gap-0.5 px-1">{children}</View>
    </View>
  );
}

function CheckboxRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      className="flex-row items-center justify-between rounded-xl px-3 py-3 active:bg-white/[0.04]"
    >
      <View className="max-w-[70%]">
        <Text className="font-sans text-sm text-snow">{label}</Text>
        {hint ? <Text className="mt-0.5 font-mono text-[10px] text-muted">{hint}</Text> : null}
      </View>
      <Checkbox checked={checked} onChange={onChange} accessibilityLabel={label} />
    </Pressable>
  );
}
