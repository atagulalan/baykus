import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { exportZipUrl } from "../../../api/client.ts";
import { Checkbox } from "../../atoms/Checkbox/Checkbox.tsx";
import { Modal } from "../../molecules/Modal/Modal.tsx";

interface ResetLibraryDialogProps {
  onConfirm: () => void;
  onClose: () => void;
  pending: boolean;
  error: boolean;
}

/** Danger zone: type-to-confirm dialog (no password guaranteed in single mode). */
export function ResetLibraryDialog({
  onConfirm,
  onClose,
  pending,
  error,
}: ResetLibraryDialogProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState(false);
  const confirmPhrase = t("settings.dangerZone.confirmPhrase");
  const canConfirm = checked && input === confirmPhrase;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      className="flex flex-col gap-4 p-4 sm:p-5 max-w-sm w-full"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-display italic text-red-500 text-lg">
          {t("settings.dangerZone.warningTitle")}
        </h2>
        <p className="text-sm text-snow">{t("settings.dangerZone.warningDesc")}</p>
      </div>
      <a
        href={exportZipUrl()}
        download
        className="border border-white/10 px-4 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted hover:text-snow hover:border-white/20 transition-colors"
      >
        {t("settings.data.export")}
      </a>

      <div className="flex items-start gap-3 text-sm text-snow mt-2">
        <div className="pt-0.5">
          <Checkbox
            checked={checked}
            onChange={setChecked}
            aria-label={t("settings.dangerZone.confirmCheckbox")}
          />
        </div>
        <button
          type="button"
          className="leading-snug text-left cursor-pointer"
          onClick={() => setChecked(!checked)}
        >
          {t("settings.dangerZone.confirmCheckbox")}
        </button>
      </div>

      <label
        className={`flex flex-col gap-1 text-sm text-snow transition-opacity ${checked ? "opacity-100" : "opacity-50 pointer-events-none"}`}
      >
        <span>
          <Trans
            i18nKey="settings.dangerZone.confirmLabel"
            values={{ phrase: confirmPhrase }}
            components={{
              phrase: <span className="bg-white/5 px-1 font-mono" />,
            }}
          />
        </span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="border border-white/10 bg-white/5 px-3 py-2 text-sm text-snow focus:border-red-500 focus:outline-none transition-colors"
        />
      </label>

      {error && <p className="text-red-400 text-xs">{t("errors.generic")}</p>}

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
          disabled={pending || !canConfirm}
          onClick={onConfirm}
          className="bg-red-600 text-white font-mono text-[10px] uppercase tracking-widest px-4 py-2.5 disabled:opacity-50"
        >
          {t("settings.dangerZone.confirm")}
        </button>
      </div>
    </Modal>
  );
}
