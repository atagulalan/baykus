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
  sendTestPush,
  updateSettings,
} from "../api/client.ts";
import type { ImportMode, ImportZipResult, Locale, Settings, SettingsPatch } from "../api/types.ts";
import { DeleteAccountDialog } from "../components/DeleteAccountDialog.tsx";
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

  if (query.isLoading) {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <div className="h-40 animate-pulse rounded-lg bg-zinc-900" />
        <div className="h-32 animate-pulse rounded-lg bg-zinc-900" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-zinc-400">{t("errors.generic")}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="rounded bg-zinc-800 px-3 py-1.5 text-sm"
        >
          {t("errors.retry")}
        </button>
      </div>
    );
  }

  const settings = query.data;
  if (!settings) return null;

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h1 className="font-semibold text-2xl">{t("settings.title")}</h1>

      <section className="flex flex-col gap-3 rounded-lg bg-zinc-900 p-4">
        <h2 className="font-medium text-sm text-zinc-300">{t("settings.general.title")}</h2>

        <label className="flex flex-col gap-1 text-sm">
          {t("settings.general.locale")}
          <select
            value={settings.locale}
            onChange={(e) => handleLocaleChange(e.target.value as Locale)}
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5"
          >
            {LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {t(`settings.general.localeName.${locale}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("settings.general.region")}
          <select
            value={settings.region}
            onChange={(e) => patch.mutate({ region: e.target.value })}
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5"
          >
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("settings.general.watchingWindow")}
          <input
            type="number"
            min={1}
            max={365}
            value={windowInput ?? String(settings.watchingWindowDays)}
            onChange={(e) => setWindowInput(e.target.value)}
            onBlur={() => handleWindowBlur(settings.watchingWindowDays)}
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5"
          />
          <span className="text-xs text-zinc-500">{t("settings.general.watchingWindowHint")}</span>
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-500">
          {t("settings.general.theme")}
          <select
            disabled
            value="dark"
            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-zinc-500"
          >
            <option value="dark">{t("settings.general.themeDark")}</option>
          </select>
          <span className="text-xs">{t("settings.general.themeSoon")}</span>
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-zinc-900 p-4">
        <h2 className="font-medium text-sm text-zinc-300">{t("settings.providers.title")}</h2>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm">
            <span>{t("settings.providers.tmdbKey")}</span>
            {settings.tmdbApiKeySet && (
              <span className="text-emerald-400 text-xs">{t("settings.providers.tmdbKeySet")}</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={tmdbKeyInput}
              onChange={(e) => setTmdbKeyInput(e.target.value)}
              placeholder={t("settings.providers.tmdbKeyPlaceholder")}
              className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleSaveTmdbKey}
              disabled={!tmdbKeyInput.trim()}
              className="shrink-0 rounded bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {t("settings.save")}
            </button>
            {settings.tmdbApiKeySet && (
              <button
                type="button"
                onClick={() => patch.mutate({ tmdbApiKey: null })}
                className="shrink-0 rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300"
              >
                {t("settings.providers.clear")}
              </button>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.scrapersEnabled}
            onChange={(e) => patch.mutate({ scrapersEnabled: e.target.checked })}
            className="h-4 w-4 accent-emerald-500"
          />
          {t("settings.providers.scrapers")}
        </label>
        <p className="text-xs text-zinc-500">{t("settings.providers.scrapersTos")}</p>
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-zinc-900 p-4">
        <h2 className="font-medium text-sm text-zinc-300">{t("settings.notifications.title")}</h2>
        {!pushSupported ? (
          <p className="text-xs text-zinc-500">{t("settings.notifications.unsupported")}</p>
        ) : pushStatusQuery.data ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => unsubscribeMutation.mutate()}
              disabled={unsubscribeMutation.isPending}
              className="self-start rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 disabled:opacity-50"
            >
              {t("settings.notifications.disable")}
            </button>
            <button
              type="button"
              onClick={() => testPushMutation.mutate()}
              disabled={testPushMutation.isPending}
              className="self-start rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 disabled:opacity-50"
            >
              {t("settings.notifications.test")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => subscribeMutation.mutate()}
            disabled={subscribeMutation.isPending}
            className="self-start rounded bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {t("settings.notifications.enable")}
          </button>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-zinc-900 p-4">
        <h2 className="font-medium text-sm text-zinc-300">{t("settings.data.title")}</h2>

        <a
          href={exportZipUrl()}
          download
          className="self-start rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300"
        >
          {t("settings.data.export")}
        </a>

        <div className="flex flex-col gap-2 border-zinc-800 border-t pt-3">
          <span className="text-sm">{t("settings.data.importTitle")}</span>

          <div className="flex flex-col gap-1 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="import-mode"
                checked={importMode === "merge"}
                onChange={() => setImportMode("merge")}
                className="accent-emerald-500"
              />
              {t("settings.data.mode.merge")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="import-mode"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
                className="accent-emerald-500"
              />
              {t("settings.data.mode.replace")}
            </label>
          </div>

          <div className="flex gap-2">
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] ?? null);
                setImportResult(null);
              }}
              className="flex-1 text-sm text-zinc-400"
            />
            <button
              type="button"
              onClick={() => importMutation.mutate()}
              disabled={!importFile || importMutation.isPending}
              className="shrink-0 rounded bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {importMutation.isPending
                ? t("settings.data.importing")
                : t("settings.data.importButton")}
            </button>
          </div>

          {importResult && (
            <div className="flex flex-col gap-1 rounded bg-zinc-800 p-3 text-sm">
              <p className="text-emerald-400">
                {t("settings.data.success", {
                  items: importResult.items,
                  watches: importResult.watches,
                  ratings: importResult.ratings,
                })}
              </p>
              {importResult.warnings.length > 0 && (
                <div className="flex flex-col gap-1 text-xs text-zinc-400">
                  <span className="font-medium">{t("settings.data.warnings")}</span>
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
          className="self-start rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300"
        >
          {t("settings.data.tvtimeImport")}
        </Link>
      </section>

      {sessionQuery.data?.mode === "multi" && (
        <section className="flex flex-col gap-3 rounded-lg bg-zinc-900 p-4">
          <h2 className="font-medium text-sm text-zinc-300">{t("auth.account.title")}</h2>
          <p className="text-sm text-zinc-400">
            {t("auth.account.handle", { handle: sessionQuery.data.handle ?? "" })}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 disabled:opacity-50"
            >
              {t("auth.account.logout")}
            </button>
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              className="rounded bg-red-950 px-3 py-1.5 text-red-400 text-sm"
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
    </div>
  );
}
