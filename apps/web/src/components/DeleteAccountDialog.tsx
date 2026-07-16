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
        className="relative flex w-full max-w-sm flex-col gap-3 border border-white/10 bg-[#101010] p-4 shadow-2xl backdrop-blur-md"
      >
        <h2 className="font-display italic text-snow text-lg">{t("auth.deleteAccount.warning")}</h2>
        <a
          href={exportZipUrl()}
          download
          className="border border-white/10 px-4 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted hover:text-snow hover:border-white/20 transition-colors"
        >
          {t("settings.data.export")}
        </a>

        <label className="flex flex-col gap-1 text-sm text-snow">
          {t("auth.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="border border-white/10 bg-white/5 px-3 py-2 text-sm text-snow focus:border-yellow focus:outline-none"
          />
        </label>

        {error && <p className="text-red-400 text-xs">{t("auth.deleteAccount.error")}</p>}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-snow"
          >
            {t("search.cancel")}
          </button>
          <button
            type="button"
            disabled={pending || !password}
            onClick={() => onConfirm(password)}
            className="bg-red-600 text-white font-mono text-[10px] uppercase tracking-widest px-4 py-2.5 disabled:opacity-50"
          >
            {t("auth.deleteAccount.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
