import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useTranslation } from "react-i18next";
import { getSettings } from "./api/client.ts";
import i18n from "./i18n/index.ts";
import "./index.css";
import { installPageViewTracking } from "./lib/pageViewTracking.ts";
import { AppErrorBoundary, initTelemetry } from "./lib/telemetry.ts";
import { ToastProvider } from "./lib/toast.tsx";
import { hydrateUiPrefsFromServer } from "./lib/uiPrefs.ts";
import { router } from "./router.tsx";

initTelemetry();
installPageViewTracking(router);

const queryClient = new QueryClient();

// Applies the persisted locale once settings load; a brief flash of the
// default locale on first paint is an acceptable trade-off for not blocking render.
// Also hydrates browse UI prefs from settings (E143 — zip/settings source of truth).
getSettings()
  .then((settings) => {
    if (settings.locale !== i18n.language) i18n.changeLanguage(settings.locale);
    hydrateUiPrefsFromServer(settings.uiPrefs);
  })
  .catch(() => {});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element missing in index.html");

function CrashFallback({ resetError }: { resetError: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-void px-6 text-center text-snow">
      <p className="font-display text-xl italic">{t("errors.generic")}</p>
      <button
        type="button"
        className="rounded-full bg-yellow px-5 py-2 font-mono text-sm text-void"
        onClick={resetError}
      >
        {t("errors.retry")}
      </button>
    </div>
  );
}

createRoot(rootEl).render(
  <StrictMode>
    <AppErrorBoundary fallback={({ resetError }) => <CrashFallback resetError={resetError} />}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
