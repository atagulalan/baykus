import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  deleteAccount,
  exportZipUrl,
  getAuthSession,
  getSettings,
  importZip,
  logout,
  resetLibrary,
  sendTestPush,
  updateSettings,
} from "../api/client.ts";
import type { ImportZipResult, Locale, Settings, SettingsPatch } from "../api/types.ts";
import { Checkbox } from "../components/Checkbox.tsx";
import { DeleteAccountDialog } from "../components/DeleteAccountDialog.tsx";
import { ResetLibraryDialog } from "../components/ResetLibraryDialog.tsx";
import { SettingsSelect } from "../components/SettingsSelect.tsx";
import {
  getCurrentPushSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "../lib/push.ts";
import {
  startManualSweep,
  useManualRefreshProgress,
  useManualRefreshRunning,
} from "../lib/staleSweep.ts";
import { useToast } from "../lib/toast.tsx";
import { readUiPrefs, resetUiSelections, resetUiWarnings, updateUiPrefs } from "../lib/uiPrefs.ts";

const LOCALES: Locale[] = ["tr", "en"];
const REGIONS = ["TR", "US", "GB", "DE", "FR", "ES", "IT", "NL"];

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tmdbKeyInput, setTmdbKeyInput] = useState("");
  const [tmdbKeyPreview, setTmdbKeyPreview] = useState<string | null>(null);
  const [isEditingTmdbKey, setIsEditingTmdbKey] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportZipResult | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [showNextUpCarousel, setShowNextUpCarousel] = useState(
    () => readUiPrefs().showNextUpCarousel,
  );
  const isManualRefreshRunning = useManualRefreshRunning();
  const refreshProgress = useManualRefreshProgress();

  const query = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: getAuthSession,
  });
  const pushSupported = isPushSupported();
  const pushStatusQuery = useQuery({
    queryKey: ["push-subscription"],
    queryFn: async () => (await getCurrentPushSubscription()) !== null,
    enabled: pushSupported,
  });

  const patch = useMutation({
    mutationFn: (p: SettingsPatch) => updateSettings(p),
    onSuccess: (settings) => {
      queryClient.setQueryData<Settings>(["settings"], settings);
      toast.show(t("settings.saved"));
    },
    onError: () => toast.show(t("errors.generic"), "error"),
  });

  function handleLocaleChange(locale: Locale) {
    i18n.changeLanguage(locale);
    patch.mutate({ locale });
  }

  function handleSaveTmdbKey() {
    const value = tmdbKeyInput.trim();
    if (!value) return;
    setTmdbKeyPreview(value.slice(0, 5));
    setIsEditingTmdbKey(false);
    patch.mutate({ tmdbApiKey: value });
    setTmdbKeyInput("");
  }

  const subscribeMutation = useMutation({
    mutationFn: subscribeToPush,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push-subscription"] });
      toast.show(t("settings.notifications.subscribed"));
    },
    onError: () => toast.show(t("errors.generic"), "error"),
  });

  const unsubscribeMutation = useMutation({
    mutationFn: unsubscribeFromPush,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["push-subscription"] }),
    onError: () => toast.show(t("errors.generic"), "error"),
  });

  const testPushMutation = useMutation({
    mutationFn: async () => {
      const subscription = await getCurrentPushSubscription();
      if (!subscription) throw new Error("no active push subscription");
      return sendTestPush(subscription.endpoint);
    },
    onSuccess: () => toast.show(t("settings.notifications.testSent")),
    onError: () => toast.show(t("errors.generic"), "error"),
  });

  const importMutation = useMutation({
    mutationFn: () => {
      if (!importFile) throw new Error("no file selected");
      return importZip(importFile, "merge");
    },
    onSuccess: (result) => {
      setImportResult(result);
      setImportFile(null);
      queryClient.invalidateQueries();
    },
    onError: () => toast.show(t("settings.data.error"), "error"),
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      navigate({ to: "/login" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (password: string) => deleteAccount(password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      navigate({ to: "/login" });
    },
  });

  const resetLibraryMutation = useMutation({
    mutationFn: resetLibrary,
    onSuccess: () => {
      setResetDialogOpen(false);
      queryClient.invalidateQueries();
      toast.show(t("settings.dangerZone.success"));
    },
    onError: () => toast.show(t("errors.generic"), "error"),
  });

  if (query.isLoading) {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <div className="h-40 animate-pulse bg-white/5" />
        <div className="h-32 animate-pulse bg-white/5" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-muted">{t("errors.generic")}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="border border-white/10 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-snow px-3 py-1.5 transition-colors"
        >
          {t("errors.retry")}
        </button>
      </div>
    );
  }

  const settings = query.data;
  if (!settings) return null;

  const sections = (
    <>
      {/* General */}
      <section className="break-inside-avoid mb-6 flex flex-col border border-white/5 bg-transparent">
        <h2 className="font-mono text-xs text-yellow tracking-widest uppercase px-6 pt-6 pb-2 border-b border-white/5 bg-transparent">
          {t("settings.general.title")}
        </h2>

        <div className="flex flex-col">
          <SettingsSelect
            label={t("settings.general.locale")}
            options={LOCALES.map((l) => ({
              value: l,
              label: t(`settings.general.localeName.${l}`),
            }))}
            value={settings.locale}
            onChange={(val) => handleLocaleChange(val as Locale)}
          />

          <SettingsSelect
            label={t("settings.general.region")}
            options={REGIONS.map((r) => ({
              value: r,
              label: t(`settings.general.regionName.${r}`),
            }))}
            value={settings.region}
            onChange={(val) => patch.mutate({ region: val })}
          />

          <SettingsSelect
            label={t("settings.general.episodeLabelFormat")}
            options={[
              { value: "SxEy", label: "S1E6" },
              { value: "S01E06", label: "S01E06" },
              { value: "compact", label: "1×6" },
            ]}
            value={settings.episodeLabelFormat}
            onChange={(val) =>
              patch.mutate({
                episodeLabelFormat: val as "SxEy" | "S01E06" | "compact",
              })
            }
          />

          <SettingsSelect
            label={t("settings.general.watchingWindow")}
            hint={t("settings.general.watchingWindowHint")}
            options={[
              {
                value: "7",
                label: t("settings.general.watchingWindowOptions.7"),
              },
              {
                value: "14",
                label: t("settings.general.watchingWindowOptions.14"),
              },
              {
                value: "30",
                label: t("settings.general.watchingWindowOptions.30"),
              },
              {
                value: "60",
                label: t("settings.general.watchingWindowOptions.60"),
              },
              {
                value: "90",
                label: t("settings.general.watchingWindowOptions.90"),
              },
              {
                value: "180",
                label: t("settings.general.watchingWindowOptions.180"),
              },
              {
                value: "365",
                label: t("settings.general.watchingWindowOptions.365"),
              },
            ]}
            value={String(settings.watchingWindowDays)}
            onChange={(val) => patch.mutate({ watchingWindowDays: Number(val) })}
          />

          <SettingsSelect
            label={t("settings.general.defaultStartPage")}
            options={[
              {
                value: "home",
                label: t("settings.general.defaultStartPageName.home"),
              },
              {
                value: "calendar",
                label: t("settings.general.defaultStartPageName.calendar"),
              },
              {
                value: "stats",
                label: t("settings.general.defaultStartPageName.stats"),
              },
            ]}
            value={settings.defaultStartPage}
            onChange={(val) =>
              patch.mutate({
                defaultStartPage: val as "home" | "calendar" | "stats",
              })
            }
          />

          <SettingsSelect
            label={t("settings.general.newSeriesDefaultStatus")}
            options={[
              {
                value: "watching",
                label: t("settings.general.newSeriesDefaultStatusName.watching"),
              },
              {
                value: "watchlist",
                label: t("settings.general.newSeriesDefaultStatusName.watchlist"),
              },
            ]}
            value={settings.newSeriesDefaultStatus}
            onChange={(val) =>
              patch.mutate({
                newSeriesDefaultStatus: val as "watching" | "watchlist",
              })
            }
          />

          {/* biome-ignore lint/a11y/noLabelWithoutControl: wraps Checkbox */}
          <label className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-white/5 px-6 py-4 text-snow transition-colors hover:bg-white/5 last:border-b-0">
            <div className="flex max-w-[70%] flex-col text-left">
              <span className="font-sans text-sm">{t("settings.general.spoilerProtection")}</span>
              <span className="mt-1 font-mono text-[10px] text-muted">
                {t("settings.general.spoilerProtectionHint")}
              </span>
            </div>
            <Checkbox
              checked={settings.spoilerProtection}
              onChange={(checked) => patch.mutate({ spoilerProtection: checked })}
            />
          </label>

          {/* biome-ignore lint/a11y/noLabelWithoutControl: wraps Checkbox */}
          <label className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-white/5 px-6 py-4 text-snow transition-colors hover:bg-white/5 last:border-b-0">
            <div className="flex max-w-[70%] flex-col text-left">
              <span className="font-sans text-sm">{t("settings.general.showNextUpCarousel")}</span>
              <span className="mt-1 font-mono text-[10px] text-muted">
                {t("settings.general.showNextUpCarouselHint")}
              </span>
            </div>
            <Checkbox
              checked={showNextUpCarousel}
              onChange={(checked) => {
                setShowNextUpCarousel(checked);
                updateUiPrefs({ showNextUpCarousel: checked });
                toast.show(t("settings.saved"));
              }}
            />
          </label>

          <SettingsSelect
            label={t("settings.general.theme")}
            options={[{ value: "dark", label: t("settings.general.themeDark") }]}
            value="dark"
            onChange={() => {}}
          />
        </div>
      </section>

      {/* Notifications */}
      <section className="break-inside-avoid mb-6 flex flex-col border border-white/5 bg-transparent">
        <h2 className="font-mono text-xs text-yellow tracking-widest uppercase px-6 pt-6 pb-2 border-b border-white/5 bg-transparent">
          {t("settings.notifications.title")}
        </h2>

        <div className="flex w-full flex-col border-b border-white/5 px-6 py-4 text-snow transition-colors last:border-b-0">
          {!pushSupported ? (
            <p className="font-mono text-[10px] text-muted">
              {t("settings.notifications.unsupported")}
            </p>
          ) : pushStatusQuery.data ? (
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => unsubscribeMutation.mutate()}
                disabled={unsubscribeMutation.isPending}
                className="font-mono text-[10px] tracking-widest uppercase border border-white/10 text-muted px-4 py-2 hover:text-snow hover:border-white/20 transition-colors disabled:opacity-50"
              >
                {t("settings.notifications.disable")}
              </button>
              <button
                type="button"
                onClick={() => testPushMutation.mutate()}
                disabled={testPushMutation.isPending}
                className="font-mono text-[10px] tracking-widest uppercase border border-white/10 text-snow px-4 py-2 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {t("settings.notifications.test")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => subscribeMutation.mutate()}
              disabled={subscribeMutation.isPending}
              className="self-start font-mono text-[10px] tracking-widest uppercase bg-yellow text-[#080808] px-4 py-2 transition-opacity disabled:opacity-50 hover:opacity-90"
            >
              {t("settings.notifications.enable")}
            </button>
          )}
        </div>
      </section>

      {/* Account (multi mode only) */}
      {sessionQuery.data?.mode === "multi" && (
        <section className="break-inside-avoid mb-6 flex flex-col border border-white/5 bg-transparent">
          <h2 className="font-mono text-xs text-yellow tracking-widest uppercase px-6 pt-6 pb-2 border-b border-white/5 bg-transparent">
            {t("auth.account.title")}
          </h2>
          <div className="flex w-full flex-col border-b border-white/5 px-6 py-4 text-snow transition-colors last:border-b-0">
            <p className="font-sans text-sm text-snow">
              {t("auth.account.handle", {
                handle: sessionQuery.data.handle ?? "",
              })}
            </p>
            <div className="flex gap-4 mt-2">
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="font-mono text-[10px] tracking-widest uppercase border border-white/10 text-muted px-4 py-2 hover:text-snow hover:border-white/20 transition-colors disabled:opacity-50"
              >
                {t("auth.account.logout")}
              </button>
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                className="font-mono text-[10px] tracking-widest uppercase border border-red-900/50 text-red-400 px-4 py-2 hover:bg-red-900/20 transition-colors"
              >
                {t("auth.account.delete")}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Providers */}
      <section className="break-inside-avoid mb-6 flex flex-col border border-white/5 bg-transparent">
        <h2 className="font-mono text-xs text-yellow tracking-widest uppercase px-6 pt-6 pb-2 border-b border-white/5 bg-transparent">
          {t("settings.providers.title")}
        </h2>

        {/* TMDB Key */}
        <div className="flex w-full flex-col border-b border-white/5 px-6 py-4 text-snow last:border-b-0">
          <div className="flex items-center justify-between mb-3">
            <span className="font-sans text-sm">{t("settings.providers.tmdbKey")}</span>
            {settings.tmdbApiKeySet && (
              <button
                type="button"
                onClick={() => {
                  patch.mutate({ tmdbApiKey: null });
                  setTmdbKeyPreview(null);
                  setIsEditingTmdbKey(false);
                  setTmdbKeyInput("");
                }}
                className="font-mono text-[10px] tracking-widest uppercase text-muted hover:text-red-400 transition-colors"
              >
                {t("settings.providers.clear")}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={
                settings.tmdbApiKeySet && !isEditingTmdbKey
                  ? `${tmdbKeyPreview ?? ""}${"•".repeat(8)}`
                  : tmdbKeyInput
              }
              readOnly={settings.tmdbApiKeySet && !isEditingTmdbKey}
              onFocus={() => {
                if (settings.tmdbApiKeySet) setIsEditingTmdbKey(true);
              }}
              onBlur={() => {
                if (!tmdbKeyInput) setIsEditingTmdbKey(false);
              }}
              onChange={(e) => setTmdbKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveTmdbKey()}
              placeholder={t("settings.providers.tmdbKeyPlaceholder")}
              className="flex-1 border-b border-white/20 bg-transparent px-2 py-2 text-snow focus:outline-none focus:border-yellow transition-colors font-mono text-xs"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={handleSaveTmdbKey}
              disabled={!tmdbKeyInput.trim()}
              className="font-mono text-[10px] tracking-widest uppercase bg-yellow text-[#080808] px-4 py-2 transition-opacity disabled:opacity-30 hover:opacity-90 shrink-0"
            >
              {t("settings.save")}
            </button>
          </div>
        </div>

        {/* Scrapers toggle */}
        {/* biome-ignore lint/a11y/noLabelWithoutControl: wraps Checkbox */}
        <label className="flex w-full cursor-pointer items-center justify-between border-b border-white/5 px-6 py-4 text-snow hover:bg-white/5 transition-colors last:border-b-0">
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-sm">{t("settings.providers.scrapers")}</span>
            <span className="font-mono text-[10px] text-muted">
              {t("settings.providers.scrapersTos")}
            </span>
          </div>
          <Checkbox
            checked={settings.scrapersEnabled}
            onChange={(checked) => patch.mutate({ scrapersEnabled: checked })}
          />
        </label>
      </section>

      {/* Data */}
      <section className="break-inside-avoid mb-6 flex flex-col border border-white/5 bg-transparent">
        <h2 className="font-mono text-xs text-yellow tracking-widest uppercase px-6 pt-6 pb-2 border-b border-white/5 bg-transparent">
          {t("settings.data.title")}
        </h2>

        <div className="flex w-full flex-col border-b border-white/5 px-6 py-4 text-snow transition-colors last:border-b-0">
          <a
            href={exportZipUrl()}
            download
            className="self-start font-mono text-[10px] tracking-widest uppercase border border-white/10 text-muted px-4 py-2 hover:text-snow hover:border-white/20 transition-colors"
          >
            {t("settings.data.export")}
          </a>
        </div>

        <div className="flex w-full flex-col border-b border-white/5 px-6 py-5 text-snow last:border-b-0">
          <span className="text-sm font-sans text-snow mb-4">{t("settings.data.importTitle")}</span>

          {/* File drop zone */}
          <label
            className={`flex flex-col items-center justify-center gap-2 border border-dashed py-8 cursor-pointer transition-colors ${
              importFile
                ? "border-yellow/40 bg-yellow/5"
                : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
            }`}
          >
            <input
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] ?? null);
                setImportResult(null);
              }}
            />
            {importFile ? (
              <>
                <span className="font-mono text-xs text-yellow">📦 {importFile.name}</span>
                <span className="font-mono text-[10px] text-muted">
                  {(importFile.size / 1024).toFixed(1)} KB
                </span>
              </>
            ) : (
              <>
                <span className="font-mono text-[10px] text-muted tracking-widest uppercase">
                  Zip dosyası seç
                </span>
                <span className="font-mono text-[10px] text-muted/50">.zip</span>
              </>
            )}
          </label>

          <button
            type="button"
            onClick={() => importMutation.mutate()}
            disabled={!importFile || importMutation.isPending}
            className="mt-3 w-full font-mono text-[10px] tracking-widest uppercase bg-yellow text-[#080808] px-4 py-3 transition-opacity disabled:opacity-30 hover:opacity-90"
          >
            {importMutation.isPending
              ? t("settings.data.importing")
              : t("settings.data.importButton")}
          </button>

          {importResult && (
            <div className="flex flex-col gap-2 border border-white/5 bg-white/5 p-4 text-sm mt-3">
              <p className="text-yellow font-mono text-xs">
                {t("settings.data.success", {
                  items: importResult.items,
                  watches: importResult.watches,
                  ratings: importResult.ratings,
                })}
              </p>
              {importResult.warnings.length > 0 && (
                <div className="flex flex-col gap-1 text-[10px] font-mono text-muted/70">
                  <span className="text-muted tracking-widest uppercase">
                    {t("settings.data.warnings")}
                  </span>
                  <ul className="list-inside list-disc">
                    {importResult.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex w-full flex-col border-b border-white/5 px-6 py-4 text-snow transition-colors last:border-b-0">
          <Link
            to="/import"
            className="self-start font-mono text-[10px] tracking-widest uppercase border border-white/10 text-muted px-4 py-2 hover:text-snow hover:border-white/20 transition-colors"
          >
            {t("settings.data.tvtimeImport")}
          </Link>
        </div>

        {/* 011 E153: Refresh all moved from profile. */}
        <div className="flex w-full flex-col border-b border-white/5 px-6 py-4 text-snow transition-colors last:border-b-0">
          <button
            type="button"
            onClick={() =>
              startManualSweep(queryClient, toast, {
                done: (newEpisodes) => t("library.refreshAllDone", { newEpisodes }),
                error: t("errors.generic"),
              })
            }
            disabled={isManualRefreshRunning}
            className="w-full font-mono text-[10px] tracking-widest uppercase border border-white/10 text-muted px-4 py-3 hover:text-snow hover:border-white/20 transition-colors disabled:opacity-50"
          >
            {refreshProgress
              ? `${refreshProgress.done}/${refreshProgress.total}`
              : t("library.refreshAll")}
          </button>
        </div>
      </section>

      {/* Danger Zone — spans both CSS columns on desktop (E119) instead of
          landing in whichever column it happens to flow into. */}
      <section className="mb-6 flex flex-col border border-red-900/20 bg-transparent [column-span:all] break-inside-avoid">
        <h2 className="font-mono text-xs text-red-400 tracking-widest uppercase px-6 pt-6 pb-2 border-b border-red-900/20 bg-transparent">
          {t("settings.dangerZone.title")}
        </h2>
        <div className="flex w-full flex-col border-b border-white/5 px-6 py-4 text-snow transition-colors">
          <p className="font-mono text-[10px] text-muted mb-2">
            {t("settings.dangerZone.resetSelectionsDesc")}
          </p>
          <button
            type="button"
            onClick={() => {
              resetUiSelections();
              setShowNextUpCarousel(true);
              toast.show(t("settings.dangerZone.resetSelectionsDone"));
            }}
            className="self-start font-mono text-[10px] tracking-widest uppercase border border-yellow/50 text-yellow px-4 py-2 hover:bg-yellow/10 transition-colors mt-2"
          >
            {t("settings.dangerZone.resetSelections")}
          </button>
        </div>
        <div className="flex w-full flex-col border-b border-white/5 px-6 py-4 text-snow transition-colors">
          <p className="font-mono text-[10px] text-muted mb-2">
            {t("settings.dangerZone.resetWarningsDesc")}
          </p>
          <button
            type="button"
            onClick={() => {
              resetUiWarnings();
              toast.show(t("settings.dangerZone.resetWarningsDone"));
            }}
            className="self-start font-mono text-[10px] tracking-widest uppercase border border-yellow/50 text-yellow px-4 py-2 hover:bg-yellow/10 transition-colors mt-2"
          >
            {t("settings.dangerZone.resetWarnings")}
          </button>
        </div>
        <div className="flex w-full flex-col border-b border-white/5 px-6 py-4 text-snow transition-colors last:border-b-0">
          <p className="font-mono text-[10px] text-muted mb-2">
            {t("settings.dangerZone.description")}
          </p>
          <button
            type="button"
            onClick={() => setResetDialogOpen(true)}
            className="self-start font-mono text-[10px] tracking-widest uppercase border border-red-900/50 text-red-400 px-4 py-2 hover:bg-red-900/20 transition-colors mt-2"
          >
            {t("settings.dangerZone.button")}
          </button>
        </div>
      </section>
    </>
  );

  return (
    <>
      <div className="max-w-4xl">
        <h1 className="mb-6 hidden font-display text-3xl italic leading-none tracking-tight text-snow sm:block sm:text-4xl">
          {t("settings.title")}
        </h1>
        <div className="columns-1 gap-6 sm:columns-2">{sections}</div>
      </div>

      {deleteDialogOpen && (
        <DeleteAccountDialog
          pending={deleteAccountMutation.isPending}
          error={deleteAccountMutation.isError}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={(password) => deleteAccountMutation.mutate(password)}
        />
      )}

      {resetDialogOpen && (
        <ResetLibraryDialog
          pending={resetLibraryMutation.isPending}
          error={resetLibraryMutation.isError}
          onClose={() => setResetDialogOpen(false)}
          onConfirm={() => resetLibraryMutation.mutate()}
        />
      )}
    </>
  );
}
