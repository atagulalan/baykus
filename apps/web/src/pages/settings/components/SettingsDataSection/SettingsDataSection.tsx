import type { QueryClient, UseMutationResult } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { exportZipUrl } from "../../../../api/client.ts";
import type { ImportZipResult } from "../../../../api/types.ts";
import { startManualSweep } from "../../../../lib/staleSweep.ts";
import type { useToast } from "../../../../lib/toast.tsx";

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
              onImportFileChange(e.target.files?.[0] ?? null);
              onImportResultClear();
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
  );
}
