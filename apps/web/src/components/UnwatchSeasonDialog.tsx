import { useTranslation } from "react-i18next";

interface UnwatchSeasonDialogProps {
  onConfirm: () => void;
  onClose: () => void;
}

export function UnwatchSeasonDialog({ onConfirm, onClose }: UnwatchSeasonDialogProps) {
  const { t } = useTranslation();

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
      </div>
    </div>
  );
}
