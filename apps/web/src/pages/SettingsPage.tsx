import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getSettings, updateSettings } from "../api/client.ts";
import type { Locale, Settings, SettingsPatch } from "../api/types.ts";
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
  const [tmdbKeyInput, setTmdbKeyInput] = useState("");

  const query = useQuery({ queryKey: ["settings"], queryFn: getSettings });
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
          <button
            type="button"
            onClick={() => unsubscribeMutation.mutate()}
            disabled={unsubscribeMutation.isPending}
            className="self-start rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 disabled:opacity-50"
          >
            {t("settings.notifications.disable")}
          </button>
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
    </div>
  );
}
