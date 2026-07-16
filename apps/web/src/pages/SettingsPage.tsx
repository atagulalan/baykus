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
import type { ImportMode, ImportZipResult, Locale, Settings, SettingsPatch } from "../api/types.ts";
import { Checkbox } from "../components/Checkbox.tsx";
import { DeleteAccountDialog } from "../components/DeleteAccountDialog.tsx";
import { ResetLibraryDialog } from "../components/ResetLibraryDialog.tsx";
import {
  getCurrentPushSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "../lib/push.ts";
import { useToast } from "../lib/toast.tsx";

const LOCALES: Locale[] = ["tr", "en"];
const REGIONS = ["TR", "US", "GB", "DE", "FR", "ES", "IT", "NL"];

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tmdbKeyInput, setTmdbKeyInput] = useState("");
  const [windowInput, setWindowInput] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportZipResult | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const query = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const sessionQuery = useQuery({ queryKey: ["auth-session"], queryFn: getAuthSession });
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

  function handleWindowBlur(currentWindowDays: number) {
    if (windowInput === null) return;
    const parsed = Number(windowInput);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 365 && parsed !== currentWindowDays) {
      patch.mutate({ watchingWindowDays: parsed });
    }
    setWindowInput(null);
  }

  function handleSaveTmdbKey() {
    const value = tmdbKeyInput.trim();
    if (!value) return;
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
      return importZip(importFile, importMode);
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

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-display italic text-snow text-4xl leading-none tracking-tight mb-2">
        {t("settings.title")}
      </h1>

      <section className="flex flex-col gap-4 border border-white/5 bg-[#101010] p-6">
        <h2 className="font-mono text-xs text-yellow tracking-widest uppercase mb-2">
          {t("settings.general.title")}
        </h2>

        <label className="flex flex-col gap-1 text-sm font-sans text-snow">
          {t("settings.general.locale")}
          <select
            value={settings.locale}
            onChange={(e) => handleLocaleChange(e.target.value as Locale)}
            className="border-b border-white/20 bg-transparent px-2 py-2 text-snow focus:outline-none focus:border-yellow transition-colors mt-1"
          >
            {LOCALES.map((locale) => (
              <option key={locale} value={locale} className="bg-[#101010]">
                {t(`settings.general.localeName.${locale}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-sans text-snow mt-2">
          {t("settings.general.region")}
          <select
            value={settings.region}
            onChange={(e) => patch.mutate({ region: e.target.value })}
            className="border-b border-white/20 bg-transparent px-2 py-2 text-snow focus:outline-none focus:border-yellow transition-colors mt-1"
          >
            {REGIONS.map((region) => (
              <option key={region} value={region} className="bg-[#101010]">
                {region}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-sans text-snow mt-2">
          {t("settings.general.watchingWindow")}
          <input
            type="number"
            min={1}
            max={365}
            value={windowInput ?? String(settings.watchingWindowDays)}
            onChange={(e) => setWindowInput(e.target.value)}
            onBlur={() => handleWindowBlur(settings.watchingWindowDays)}
            className="border-b border-white/20 bg-transparent px-2 py-2 text-snow focus:outline-none focus:border-yellow transition-colors mt-1"
          />
          <span className="font-mono text-[10px] text-muted mt-1">
            {t("settings.general.watchingWindowHint")}
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm font-sans text-muted mt-2">
          {t("settings.general.theme")}
          <select
            disabled
            value="dark"
            className="border-b border-white/10 bg-transparent px-2 py-2 text-muted mt-1"
          >
            <option value="dark">{t("settings.general.themeDark")}</option>
          </select>
          <span className="font-mono text-[10px] text-muted mt-1">
            {t("settings.general.themeSoon")}
          </span>
        </label>
      </section>

      <section className="flex flex-col gap-4 border border-white/5 bg-[#101010] p-6">
        <h2 className="font-mono text-xs text-yellow tracking-widest uppercase mb-2">
          {t("settings.providers.title")}
        </h2>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-snow">
            <span>{t("settings.providers.tmdbKey")}</span>
            {settings.tmdbApiKeySet && (
              <span className="text-yellow text-xs font-mono">
                {t("settings.providers.tmdbKeySet")}
              </span>
            )}
          </div>
          <div className="flex gap-4">
            <input
              type="password"
              value={tmdbKeyInput}
              onChange={(e) => setTmdbKeyInput(e.target.value)}
              placeholder={t("settings.providers.tmdbKeyPlaceholder")}
              className="flex-1 border-b border-white/20 bg-transparent px-2 py-2 text-sm text-snow focus:outline-none focus:border-yellow transition-colors"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleSaveTmdbKey}
              disabled={!tmdbKeyInput.trim()}
              className="font-mono text-[10px] tracking-widest uppercase bg-yellow text-[#080808] px-4 py-2 transition-opacity disabled:opacity-50 hover:opacity-90"
            >
              {t("settings.save")}
            </button>
            {settings.tmdbApiKeySet && (
              <button
                type="button"
                onClick={() => patch.mutate({ tmdbApiKey: null })}
                className="font-mono text-[10px] tracking-widest uppercase border border-white/10 text-muted px-4 py-2 hover:text-snow hover:border-white/20 transition-colors"
              >
                {t("settings.providers.clear")}
              </button>
            )}
          </div>
        </div>

        {/* biome-ignore lint/a11y/noLabelWithoutControl: wraps Checkbox, which renders a native <button> — a labelable element per the HTML spec, so click-to-toggle still works. */}
        <label className="flex items-center gap-3 text-sm text-snow mt-4 cursor-pointer">
          <Checkbox
            checked={settings.scrapersEnabled}
            onChange={(checked) => patch.mutate({ scrapersEnabled: checked })}
          />
          {t("settings.providers.scrapers")}
        </label>
        <p className="font-mono text-[10px] text-muted">{t("settings.providers.scrapersTos")}</p>
      </section>

      <section className="flex flex-col gap-4 border border-white/5 bg-[#101010] p-6">
        <h2 className="font-mono text-xs text-yellow tracking-widest uppercase mb-2">
          {t("settings.notifications.title")}
        </h2>
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
      </section>

      <section className="flex flex-col gap-4 border border-white/5 bg-[#101010] p-6">
        <h2 className="font-mono text-xs text-yellow tracking-widest uppercase mb-2">
          {t("settings.data.title")}
        </h2>

        <a
          href={exportZipUrl()}
          download
          className="self-start font-mono text-[10px] tracking-widest uppercase border border-white/10 text-muted px-4 py-2 hover:text-snow hover:border-white/20 transition-colors"
        >
          {t("settings.data.export")}
        </a>

        <div className="flex flex-col gap-4 border-t border-white/5 pt-4 mt-2">
          <span className="text-sm font-sans text-snow">{t("settings.data.importTitle")}</span>

          <div className="flex flex-col gap-2 text-sm text-snow">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="import-mode"
                checked={importMode === "merge"}
                onChange={() => setImportMode("merge")}
                className="accent-yellow"
              />
              {t("settings.data.mode.merge")}
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="import-mode"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
                className="accent-yellow"
              />
              {t("settings.data.mode.replace")}
            </label>
          </div>

          <div className="flex gap-4 items-center">
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] ?? null);
                setImportResult(null);
              }}
              className="flex-1 font-mono text-xs text-muted file:bg-[#101010] file:border file:border-white/10 file:px-3 file:py-1 file:text-muted file:font-mono file:text-[10px] file:uppercase file:tracking-widest file:mr-4 hover:file:text-snow transition-colors"
            />
            <button
              type="button"
              onClick={() => importMutation.mutate()}
              disabled={!importFile || importMutation.isPending}
              className="shrink-0 font-mono text-[10px] tracking-widest uppercase bg-yellow text-[#080808] px-4 py-2 transition-opacity disabled:opacity-50 hover:opacity-90"
            >
              {importMutation.isPending
                ? t("settings.data.importing")
                : t("settings.data.importButton")}
            </button>
          </div>

          {importResult && (
            <div className="flex flex-col gap-2 border border-white/5 bg-white/5 p-4 text-sm">
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

        <Link
          to="/import"
          className="self-start font-mono text-[10px] tracking-widest uppercase border border-white/10 text-muted px-4 py-2 hover:text-snow hover:border-white/20 transition-colors mt-2"
        >
          {t("settings.data.tvtimeImport")}
        </Link>
      </section>

      <section className="flex flex-col gap-4 border border-red-900/20 bg-[#101010] p-6">
        <h2 className="font-mono text-xs text-red-400 tracking-widest uppercase mb-2">
          {t("settings.dangerZone.title")}
        </h2>
        <p className="font-mono text-[10px] text-muted">{t("settings.dangerZone.description")}</p>
        <button
          type="button"
          onClick={() => setResetDialogOpen(true)}
          className="self-start font-mono text-[10px] tracking-widest uppercase border border-red-900/50 text-red-400 px-4 py-2 hover:bg-red-900/20 transition-colors mt-2"
        >
          {t("settings.dangerZone.button")}
        </button>
      </section>

      {sessionQuery.data?.mode === "multi" && (
        <section className="flex flex-col gap-4 border border-white/5 bg-[#101010] p-6">
          <h2 className="font-mono text-xs text-yellow tracking-widest uppercase mb-2">
            {t("auth.account.title")}
          </h2>
          <p className="font-sans text-sm text-snow">
            {t("auth.account.handle", { handle: sessionQuery.data.handle ?? "" })}
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
        </section>
      )}

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
    </div>
  );
}
