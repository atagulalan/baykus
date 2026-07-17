import { useTranslation } from "react-i18next";
import { Modal } from "./Modal.tsx";

interface RemoveSeriesDialogProps {
  title: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function RemoveSeriesDialog({ title, onConfirm, onClose }: RemoveSeriesDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={true} onClose={onClose} className="flex flex-col gap-3 p-4 sm:p-4">
      <h2 className="font-display italic text-snow text-lg">{t("library.card.remove")}</h2>

      <p className="text-sm text-snow">{t("library.removeConfirm", { title })}</p>

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
          {t("library.card.remove")}
        </button>
      </div>
    </Modal>
  );
}
