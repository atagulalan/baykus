import { Heart, MoreVertical } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ManualList, WatchCategory } from "../../../api/types.ts";
import { Modal } from "../../molecules/Modal/Modal.tsx";

interface SeriesActionsMenuProps {
  favorite: boolean;
  manualList: ManualList | null;
  category: WatchCategory;
  pushMuted: boolean;
  onToggleFavorite: () => void;
  onChangeManualList: (manualList: ManualList | null) => void;
  onToggleMute: () => void;
  onRemove: () => void;
  /** Trigger button styling — the hero row and the header slot size it differently. */
  triggerClassName?: string;
}

const MENU_ITEM_CLASS =
  "block w-full px-4 py-3.5 text-left text-xs font-mono text-muted hover:text-snow hover:bg-white/5 transition-colors border-b border-white/5";

/**
 * Series detail's overflow menu (favorite / list / mute / remove). Extracted so it
 * can render twice from SeriesDetailPage — inline next to the title on desktop, and portaled
 * into the mobile header's right slot — while sharing one implementation.
 */
export function SeriesActionsMenu({
  favorite,
  manualList,
  category,
  pushMuted,
  onToggleFavorite,
  onChangeManualList,
  onToggleMute,
  onRemove,
  triggerClassName = "px-2 py-1 text-muted hover:text-snow transition-colors",
}: SeriesActionsMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  function act(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("series.menu")}
        className={triggerClassName}
      >
        <MoreVertical size={18} strokeWidth={1.5} />
      </button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        desktop="popover"
        popoverClassName="w-56"
        title={t("series.menu")}
        className="!p-0 !overflow-hidden"
      >
        <button
          type="button"
          onClick={() => act(onToggleFavorite)}
          aria-pressed={favorite}
          className={`flex w-full items-center gap-2 ${MENU_ITEM_CLASS}`}
        >
          <Heart size={16} className={favorite ? "fill-yellow text-yellow" : ""} />
          {t(favorite ? "series.unfavorite" : "series.favorite")}
        </button>
        {manualList !== null && (
          <button
            type="button"
            onClick={() => act(() => onChangeManualList(null))}
            className={MENU_ITEM_CLASS}
          >
            {t("category.watching")}
          </button>
        )}
        {manualList !== "watch_later" && (
          <button
            type="button"
            onClick={() => act(() => onChangeManualList("watch_later"))}
            className={MENU_ITEM_CLASS}
          >
            {t("manualList.watch_later")}
          </button>
        )}
        {manualList !== "stopped" && category !== "finished" && (
          <button
            type="button"
            onClick={() => act(() => onChangeManualList("stopped"))}
            className={MENU_ITEM_CLASS}
          >
            {t("manualList.stopped")}
          </button>
        )}
        <button type="button" onClick={() => act(onToggleMute)} className={MENU_ITEM_CLASS}>
          {pushMuted ? t("series.unmute") : t("series.mute")}
        </button>
        <button
          type="button"
          onClick={() => act(onRemove)}
          className="block w-full px-4 py-3.5 text-left text-xs font-mono text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
        >
          {t("library.card.remove")}
        </button>
      </Modal>
    </div>
  );
}
