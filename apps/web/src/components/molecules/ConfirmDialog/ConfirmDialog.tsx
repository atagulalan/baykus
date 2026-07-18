import { useTranslation } from "react-i18next";
import { Modal } from "../Modal/Modal.tsx";

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  variant?: "danger";
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  variant,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const confirmClassName =
    variant === "danger"
      ? "bg-red-600 text-white font-mono text-[10px] uppercase tracking-widest px-4 py-2.5"
      : "bg-yellow text-ink font-mono text-[10px] uppercase tracking-widest px-4 py-2.5";

  return (
    <Modal isOpen={true} onClose={onClose} className="flex flex-col gap-3 p-4 sm:p-4">
      <h2 className="font-display italic text-snow text-lg">{title}</h2>

      <p className="text-sm text-snow">{body}</p>

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
          className={confirmClassName}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
