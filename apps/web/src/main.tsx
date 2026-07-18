import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getSettings } from "./api/client.ts";
import i18n from "./i18n/index.ts";
import "./index.css";
import { ToastProvider } from "./lib/toast.tsx";
import { hydrateUiPrefsFromServer } from "./lib/uiPrefs.ts";
import { router } from "./router.tsx";

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

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
