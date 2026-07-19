import { useState } from "react";
import { useTranslation } from "react-i18next";
import { exportZipUrl } from "../../../api/client.ts";
import { Modal } from "../../molecules/Modal/Modal.tsx";

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
    <Modal isOpen={true} onClose={onClose} className="flex flex-col gap-3 p-4 sm:p-4">
      <h2 className="font-display italic text-snow text-lg">{t("auth.deleteAccount.warning")}</h2>
      <a
        href={exportZipUrl()}
        download
        className="rounded-lg border border-white/10 px-4 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-white/20 hover:text-snow"
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
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-snow focus:border-yellow focus:outline-none"
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
          className="rounded-lg bg-red-600 px-4 py-2.5 font-mono text-[10px] text-white uppercase tracking-widest disabled:opacity-50"
        >
          {t("auth.deleteAccount.confirm")}
        </button>
      </div>
    </Modal>
  );
}
