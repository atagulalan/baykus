import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { WatchCategory } from "../api/types.ts";
import { CATEGORY_ICONS } from "../lib/categoryIcons.ts";
import { Checkbox } from "./Checkbox.tsx";
import { Modal } from "./Modal.tsx";

interface RemoveSectionDialogProps {
  category: WatchCategory;
  onConfirm: (dontShowAgain: boolean) => void;
  onClose: () => void;
}

/** E143: first-time section remove confirm; optional "don't show again". */
export function RemoveSectionDialog({ category, onConfirm, onClose }: RemoveSectionDialogProps) {
  const { t } = useTranslation();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const Icon = CATEGORY_ICONS[category];

  return (
    <Modal isOpen={true} onClose={onClose} title={t("watch.removeSectionTitle")} className="p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted" />
          <p className="text-sm leading-relaxed text-snow">
            {t("watch.removeSectionConfirm", { category: t(`category.${category}`) })}
          </p>
        </div>
        <p className="text-sm leading-relaxed text-muted">{t("watch.removeSectionHint")}</p>

        <div className="flex items-start gap-3 text-sm text-snow">
          <Checkbox
            checked={dontShowAgain}
            onChange={setDontShowAgain}
            aria-label={t("watch.removeSectionDontShow")}
            className="mt-0.5"
          />
          <button
            type="button"
            className="cursor-pointer text-left leading-snug"
            onClick={() => setDontShowAgain(!dontShowAgain)}
          >
            {t("watch.removeSectionDontShow")}
          </button>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="border border-white/10 px-3 py-2 font-mono text-[10px] tracking-widest text-muted uppercase transition-colors hover:border-white/20 hover:text-snow"
          >
            {t("watch.removeSectionCancel")}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(dontShowAgain)}
            className="bg-yellow px-4 py-2 font-mono text-[10px] tracking-widest text-[#080808] uppercase transition-opacity hover:opacity-90"
          >
            {t("watch.removeSectionConfirmBtn")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
