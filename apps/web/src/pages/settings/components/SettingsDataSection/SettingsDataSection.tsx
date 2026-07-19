import type { QueryClient, UseMutationResult } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { exportZipUrl } from "../../../../api/client.ts";
import type { ImportZipResult } from "../../../../api/types.ts";
import { pageViewTransition } from "../../../../lib/pageViewTransition.ts";
import { SETTINGS_BLOCK } from "../../../../lib/settingsChrome.ts";
import { startManualSweep } from "../../../../lib/staleSweep.ts";
import type { useToast } from "../../../../lib/toast.tsx";
import { SettingsSection } from "../SettingsSection/SettingsSection.tsx";

interface SettingsDataSectionProps {
  importFile: File | null;
  onImportFileChange: (file: File | null) => void;
  importResult: ImportZipResult | null;
  onImportResultClear: () => void;
  importMutation: UseMutationResult<ImportZipResult, Error, void, unknown>;
  isManualRefreshRunning: boolean;
  refreshProgress: { done: number; total: number } | null;
  queryClient: QueryClient;
  toast: ReturnType<typeof useToast>;
}

export function SettingsDataSection({
  importFile,
  onImportFileChange,
  importResult,
  onImportResultClear,
  importMutation,
  isManualRefreshRunning,
  refreshProgress,
  queryClient,
  toast,
}: SettingsDataSectionProps) {
  const { t } = useTranslation();

  return (
    <SettingsSection title={t("settings.data.title")}>
      <div className={SETTINGS_BLOCK}>
        <a
          href={exportZipUrl()}
          download
          className="self-start rounded-full border border-white/10 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-white/20 hover:text-snow"
        >
          {t("settings.data.export")}
        </a>
      </div>

      <div className={SETTINGS_BLOCK}>
        <span className="font-sans text-sm text-snow">{t("settings.data.importTitle")}</span>

        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-7 transition-colors ${
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
              onImportFileChange(e.target.files?.[0] ?? null);
              onImportResultClear();
            }}
          />
          {importFile ? (
            <>
              <span className="font-mono text-xs text-yellow">{importFile.name}</span>
              <span className="font-mono text-[10px] text-muted">
                {(importFile.size / 1024).toFixed(1)} KB
              </span>
            </>
          ) : (
            <>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {t("settings.data.chooseFile")}
              </span>
              <span className="font-mono text-[10px] text-muted/50">.zip</span>
            </>
          )}
        </label>

        <button
          type="button"
          onClick={() => importMutation.mutate()}
          disabled={!importFile || importMutation.isPending}
          className="w-full rounded-full bg-yellow px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#080808] transition-opacity hover:opacity-90 disabled:opacity-30"
        >
          {importMutation.isPending
            ? t("settings.data.importing")
            : t("settings.data.importButton")}
        </button>

        {importResult && (
          <div className="flex flex-col gap-2 rounded-xl bg-white/[0.03] p-4 text-sm">
            <p className="font-mono text-xs text-yellow">
              {t("settings.data.success", {
                items: importResult.items,
                watches: importResult.watches,
                ratings: importResult.ratings,
              })}
            </p>
            {importResult.warnings.length > 0 && (
              <div className="flex flex-col gap-1 font-mono text-[10px] text-muted/70">
                <span className="uppercase tracking-widest text-muted">
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

      <div className={SETTINGS_BLOCK}>
        <Link
          to="/import"
          viewTransition={pageViewTransition}
          className="self-start rounded-full border border-white/10 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-white/20 hover:text-snow"
        >
          {t("settings.data.tvtimeImport")}
        </Link>
      </div>

      <div className={SETTINGS_BLOCK}>
        <button
          type="button"
          onClick={() =>
            startManualSweep(queryClient, toast, {
              done: (newEpisodes) => t("library.refreshAllDone", { newEpisodes }),
              error: t("errors.generic"),
            })
          }
          disabled={isManualRefreshRunning}
          className="w-full rounded-full border border-white/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-white/20 hover:text-snow disabled:opacity-50"
        >
          {refreshProgress
            ? `${refreshProgress.done}/${refreshProgress.total}`
            : t("library.refreshAll")}
        </button>
      </div>
    </SettingsSection>
  );
}
