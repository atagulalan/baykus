import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "../../molecules/ConfirmDialog/ConfirmDialog.tsx";

interface UnwatchSeasonDialogProps {
  onConfirm: () => void;
  onClose: () => void;
}

export function UnwatchSeasonDialog({ onConfirm, onClose }: UnwatchSeasonDialogProps) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      title={t("series.unwatchSeasonTitle")}
      body={t("series.unwatchSeasonWarning")}
      confirmLabel={t("series.unwatchSeasonConfirm")}
      onConfirm={onConfirm}
      onClose={onClose}
      variant="danger"
    />
  );
}
