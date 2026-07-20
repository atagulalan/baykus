import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  deleteAccount,
  getAuthSession,
  getSettings,
  importZip,
  logout,
  oauthLink,
  oauthUnlink,
  resetLibrary,
  sendTestPush,
  updateSettings,
} from "../../api/client.ts";
import type {
  ImportZipResult,
  Locale,
  OAuthProvider,
  Settings,
  SettingsPatch,
} from "../../api/types.ts";
import { Checkbox } from "../../components/atoms/Checkbox/Checkbox.tsx";
import { SkeletonSettingsSections } from "../../components/atoms/Skeleton/Skeleton.tsx";
import { DeleteAccountDialog } from "../../components/dialogs/DeleteAccountDialog/DeleteAccountDialog.tsx";
import { ResetLibraryDialog } from "../../components/dialogs/ResetLibraryDialog/ResetLibraryDialog.tsx";
import { PageTitleRow } from "../../components/molecules/PageTitleRow/PageTitleRow.tsx";
import { obtainIdToken } from "../../lib/oauth.ts";
import {
  getCurrentPushSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "../../lib/push.ts";
import { SETTINGS_BLOCK, SETTINGS_ROW } from "../../lib/settingsChrome.ts";
import { useManualRefreshProgress, useManualRefreshRunning } from "../../lib/staleSweep.ts";
import { useToast } from "../../lib/toast.tsx";
import { readUiPrefs, resetUiSelections, resetUiWarnings } from "../../lib/uiPrefs.ts";
import { SettingsDataSection } from "./components/SettingsDataSection/SettingsDataSection.tsx";
import { SettingsGeneralSection } from "./components/SettingsGeneralSection/SettingsGeneralSection.tsx";
import { SettingsSection } from "./components/SettingsSection/SettingsSection.tsx";

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
    mutationFn: (payload: {
      password?: string;
      provider?: OAuthProvider;
      idToken?: string;
      nonce?: string;
    }) => deleteAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      navigate({ to: "/login" });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (provider: OAuthProvider) => oauthUnlink(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      toast.show(t("settings.saved"));
    },
    onError: () => toast.show(t("auth.oauth.unlinkError"), "error"),
  });

  const linkMutation = useMutation({
    mutationFn: async (provider: OAuthProvider) => {
      const clientId = sessionQuery.data?.oauthProviders[provider]?.clientId;
      if (!clientId) throw new Error("provider not configured");
      const { idToken, nonce } = await obtainIdToken(provider, clientId);
      return oauthLink({
        provider,
        idToken,
        ...(nonce !== undefined ? { nonce } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      toast.show(t("settings.saved"));
    },
    onError: () => toast.show(t("auth.oauth.linkError"), "error"),
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
      <div className="page-top">
        <SkeletonSettingsSections sections={3} />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="page-top content-inset flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-muted">{t("errors.generic")}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="rounded-full border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-snow"
        >
          {t("errors.retry")}
        </button>
      </div>
    );
  }

  const settings = query.data;
  const authSession = sessionQuery.data;
  if (!settings) return null;

  const sections = (
    <>
      <SettingsGeneralSection
        settings={settings}
        showNextUpCarousel={showNextUpCarousel}
        onShowNextUpCarouselChange={setShowNextUpCarousel}
        onPatch={(p) => patch.mutate(p)}
        onLocaleChange={handleLocaleChange}
        onSaved={() => toast.show(t("settings.saved"))}
      />

      <SettingsSection title={t("settings.notifications.title")}>
        <div className={SETTINGS_BLOCK}>
          {!pushSupported ? (
            <p className="font-mono text-[10px] text-muted">
              {t("settings.notifications.unsupported")}
            </p>
          ) : pushStatusQuery.data ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => unsubscribeMutation.mutate()}
                disabled={unsubscribeMutation.isPending}
                className="rounded-full border border-white/10 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-white/20 hover:text-snow disabled:opacity-50"
              >
                {t("settings.notifications.disable")}
              </button>
              <button
                type="button"
                onClick={() => testPushMutation.mutate()}
                disabled={testPushMutation.isPending}
                className="rounded-full border border-white/10 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-snow transition-colors hover:bg-white/[0.04] disabled:opacity-50"
              >
                {t("settings.notifications.test")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => subscribeMutation.mutate()}
              disabled={subscribeMutation.isPending}
              className="self-start rounded-full bg-yellow px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-[#080808] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {t("settings.notifications.enable")}
            </button>
          )}
        </div>
      </SettingsSection>

      {authSession?.mode === "multi" && (
        <SettingsSection title={t("auth.account.title")}>
          <div className={SETTINGS_BLOCK}>
            <p className="font-sans text-sm text-snow">
              {t("auth.account.handle", {
                handle: authSession.handle ?? "",
              })}
            </p>
            {(authSession.oauthProviders.google || authSession.oauthProviders.apple) && (
              <div className="flex flex-col gap-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  {t("auth.oauth.linked")}
                </p>
                {(["google", "apple"] as const).map((provider) => {
                  if (!authSession.oauthProviders[provider]) return null;
                  const linked = authSession.identities.includes(provider);
                  return (
                    <div key={provider} className="flex items-center justify-between gap-2">
                      <span className="font-sans text-sm text-snow">
                        {provider === "google" ? t("auth.oauth.google") : t("auth.oauth.apple")}
                        {linked ? ` · ${t("auth.oauth.connected")}` : ""}
                      </span>
                      {linked ? (
                        <button
                          type="button"
                          disabled={unlinkMutation.isPending}
                          onClick={() => unlinkMutation.mutate(provider)}
                          className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-red-400 disabled:opacity-50"
                        >
                          {t("auth.oauth.unlink")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={linkMutation.isPending}
                          onClick={() => linkMutation.mutate(provider)}
                          className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-snow disabled:opacity-50"
                        >
                          {t("auth.oauth.link")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="rounded-full border border-white/10 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-white/20 hover:text-snow disabled:opacity-50"
              >
                {t("auth.account.logout")}
              </button>
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                className="rounded-full border border-red-900/50 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-red-400 transition-colors hover:bg-red-900/20"
              >
                {t("auth.account.delete")}
              </button>
            </div>
          </div>
        </SettingsSection>
      )}

      <SettingsSection title={t("settings.providers.title")}>
        <div className={SETTINGS_BLOCK}>
          <div className="flex items-center justify-between">
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
                className="font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-red-400"
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
              className="flex-1 rounded-lg bg-white/[0.04] px-3 py-2 font-mono text-xs text-snow transition-colors placeholder:text-muted/50 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-yellow/60"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={handleSaveTmdbKey}
              disabled={!tmdbKeyInput.trim()}
              className="shrink-0 rounded-full bg-yellow px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-[#080808] transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              {t("settings.save")}
            </button>
          </div>
        </div>

        {/* biome-ignore lint/a11y/noLabelWithoutControl: wraps Checkbox */}
        <label className={`cursor-pointer ${SETTINGS_ROW}`}>
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
      </SettingsSection>

      <SettingsDataSection
        importFile={importFile}
        onImportFileChange={setImportFile}
        importResult={importResult}
        onImportResultClear={() => setImportResult(null)}
        importMutation={importMutation}
        isManualRefreshRunning={isManualRefreshRunning}
        refreshProgress={refreshProgress}
        queryClient={queryClient}
        toast={toast}
      />

      {/* Danger Zone — spans both CSS columns on desktop (E119). */}
      <SettingsSection title={t("settings.dangerZone.title")} danger fullWidth>
        <div className={SETTINGS_BLOCK}>
          <p className="font-mono text-[10px] text-muted">
            {t("settings.dangerZone.resetSelectionsDesc")}
          </p>
          <button
            type="button"
            onClick={() => {
              resetUiSelections();
              setShowNextUpCarousel(true);
              toast.show(t("settings.dangerZone.resetSelectionsDone"));
            }}
            className="self-start rounded-full border border-yellow/50 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-yellow transition-colors hover:bg-yellow/10"
          >
            {t("settings.dangerZone.resetSelections")}
          </button>
        </div>
        <div className={SETTINGS_BLOCK}>
          <p className="font-mono text-[10px] text-muted">
            {t("settings.dangerZone.resetWarningsDesc")}
          </p>
          <button
            type="button"
            onClick={() => {
              resetUiWarnings();
              toast.show(t("settings.dangerZone.resetWarningsDone"));
            }}
            className="self-start rounded-full border border-yellow/50 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-yellow transition-colors hover:bg-yellow/10"
          >
            {t("settings.dangerZone.resetWarnings")}
          </button>
        </div>
        <div className={SETTINGS_BLOCK}>
          <p className="font-mono text-[10px] text-muted">{t("settings.dangerZone.description")}</p>
          <button
            type="button"
            onClick={() => setResetDialogOpen(true)}
            className="self-start rounded-full border border-red-900/50 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-red-400 transition-colors hover:bg-red-900/20"
          >
            {t("settings.dangerZone.button")}
          </button>
        </div>
      </SettingsSection>
    </>
  );

  return (
    <>
      <div className="page-top mx-auto max-w-4xl">
        <div className="mb-4">
          <PageTitleRow>{t("settings.title")}</PageTitleRow>
        </div>
        <div className="columns-1 gap-6 sm:columns-2">{sections}</div>
      </div>

      {deleteDialogOpen && authSession && (
        <DeleteAccountDialog
          pending={deleteAccountMutation.isPending}
          error={deleteAccountMutation.isError}
          hasPassword={authSession.hasPassword}
          identities={authSession.identities}
          oauthProviders={authSession.oauthProviders}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={(payload) => deleteAccountMutation.mutate(payload)}
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
