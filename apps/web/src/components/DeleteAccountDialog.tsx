import { useState } from "react";
import { useTranslation } from "react-i18next";
import { exportZipUrl } from "../api/client.ts";

interface DeleteAccountDialogProps {
  onConfirm: (password: string) => void;
  onClose: () => void;
  pending: boolean;
  error: boolean;
}

/** ui.md §Hesap: "Önce son bir yedek indir → [Zip indir] [Yine de sil]". */
export function DeleteAccountDialog({
  onConfirm,
  onClose,
  pending,
  error,
}: DeleteAccountDialogProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("search.cancel")}
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex w-full max-w-sm flex-col gap-3 rounded-lg bg-zinc-900 p-4 shadow-xl"
      >
        <h2 className="font-medium text-red-400 text-sm">{t("auth.deleteAccount.warning")}</h2>
        <a
          href={exportZipUrl()}
          download
          className="rounded bg-zinc-800 px-3 py-1.5 text-center text-sm text-zinc-100"
        >
          {t("settings.data.export")}
        </a>

        <label className="flex flex-col gap-1 text-sm">
          {t("auth.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5"
          />
        </label>

        {error && <p className="text-red-400 text-xs">{t("auth.deleteAccount.error")}</p>}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100"
          >
            {t("search.cancel")}
          </button>
          <button
            type="button"
            disabled={pending || !password}
            onClick={() => onConfirm(password)}
            className="rounded bg-red-600 px-3 py-1.5 font-medium text-sm text-white disabled:opacity-50"
          >
            {t("auth.deleteAccount.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
