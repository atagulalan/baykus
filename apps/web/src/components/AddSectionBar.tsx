import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CATEGORY_ORDER, type WatchCategory } from "../api/types.ts";
import { CATEGORY_ICONS } from "../lib/categoryIcons.ts";
import { Modal } from "./Modal.tsx";

interface AddSectionBarProps {
  present: readonly WatchCategory[];
  onAdd: (category: WatchCategory) => void;
}

/** E141: bottom of /watch — pick a category section that is not already on the page. */
export function AddSectionBar({ present, onAdd }: AddSectionBarProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const available = CATEGORY_ORDER.filter((c) => !present.includes(c));

  if (available.length === 0) return null;

  return (
    <div className="pt-2 pb-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full min-h-11 items-center justify-center gap-2 border border-dashed border-white/15 px-4 py-3 font-mono text-[10px] tracking-widest text-muted uppercase transition-colors hover:border-white/30 hover:text-snow"
      >
        <Plus size={16} strokeWidth={1.75} />
        {t("watch.addSection")}
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        desktop="modal"
        title={t("watch.addSectionTitle")}
        className="p-4"
      >
        <ul className="flex flex-col gap-1">
          {available.map((c) => {
            const Icon = CATEGORY_ICONS[c];
            return (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => {
                    onAdd(c);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-2 py-3 text-left text-sm text-snow transition-colors hover:bg-white/5"
                >
                  <Icon size={16} strokeWidth={1.75} className="shrink-0 text-muted" />
                  {t(`category.${c}`)}
                </button>
              </li>
            );
          })}
        </ul>
      </Modal>
    </div>
  );
}
