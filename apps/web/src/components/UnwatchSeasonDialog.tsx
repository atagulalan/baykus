import { useTranslation } from "react-i18next";
import { Modal } from "./Modal.tsx";

interface UnwatchSeasonDialogProps {
  onConfirm: () => void;
  onClose: () => void;
}

export function UnwatchSeasonDialog({ onConfirm, onClose }: UnwatchSeasonDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={true} onClose={onClose} className="flex flex-col gap-3 p-4 sm:p-4">
      <h2 className="font-display italic text-snow text-lg">{t("series.unwatchSeasonTitle")}</h2>

      <p className="text-sm text-snow">{t("series.unwatchSeasonWarning")}</p>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-snow"
        >
          {t("search.cancel")}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="bg-red-600 text-white font-mono text-[10px] uppercase tracking-widest px-4 py-2.5"
        >
          {t("series.unwatchSeasonConfirm")}
        </button>
      </div>
    </Modal>
  );
}
