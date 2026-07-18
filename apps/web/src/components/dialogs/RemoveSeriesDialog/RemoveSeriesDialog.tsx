import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "../../molecules/ConfirmDialog/ConfirmDialog.tsx";

interface RemoveSeriesDialogProps {
  title: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function RemoveSeriesDialog({ title, onConfirm, onClose }: RemoveSeriesDialogProps) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      title={t("library.card.remove")}
      body={t("library.removeConfirm", { title })}
      confirmLabel={t("library.card.remove")}
      onConfirm={onConfirm}
      onClose={onClose}
      variant="danger"
    />
  );
}
