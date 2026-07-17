import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { importZip } from "../api/client.ts";
import type { ImportMode, ImportZipResult } from "../api/types.ts";
import { useToast } from "../lib/toast.tsx";
import { Modal } from "./Modal.tsx";

interface RestoreBackupDialogProps {
  onClose: () => void;
}

export function RestoreBackupDialog({ onClose }: RestoreBackupDialogProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportZipResult | null>(null);

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

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      className="flex flex-col gap-4 p-4 sm:p-5 max-w-sm w-full"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-display italic text-snow text-lg">{t("settings.data.importTitle")}</h2>
      </div>

      <div className="flex flex-col gap-3 text-sm text-snow mt-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="import-mode-dialog"
            checked={importMode === "merge"}
            onChange={() => setImportMode("merge")}
            className="accent-yellow"
          />
          {t("settings.data.mode.merge")}
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="import-mode-dialog"
            checked={importMode === "replace"}
            onChange={() => setImportMode("replace")}
            className="accent-yellow"
          />
          {t("settings.data.mode.replace")}
        </label>
      </div>

      <div className="mt-2">
        <input
          type="file"
          accept=".zip,application/zip"
          onChange={(e) => {
            setImportFile(e.target.files?.[0] ?? null);
            setImportResult(null);
          }}
          className="w-full font-mono text-xs text-muted file:bg-[#101010] file:border file:border-white/10 file:px-3 file:py-1.5 file:text-muted file:font-mono file:text-[10px] file:uppercase file:tracking-widest file:mr-4 hover:file:text-snow transition-colors"
        />
      </div>

      {importResult && (
        <div className="flex flex-col gap-2 border border-white/5 bg-white/5 p-4 text-sm mt-2">
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

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-snow transition-colors"
        >
          {t("search.cancel")}
        </button>
        <button
          type="button"
          onClick={() => importMutation.mutate()}
          disabled={!importFile || importMutation.isPending}
          className="bg-yellow text-[#080808] font-mono text-[10px] uppercase tracking-widest px-4 py-2.5 disabled:opacity-50 transition-opacity hover:opacity-90"
        >
          {importMutation.isPending
            ? t("settings.data.importing")
            : t("settings.data.importButton")}
        </button>
      </div>
    </Modal>
  );
}
