import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../molecules/Modal/Modal.tsx";

interface SeasonActionsMenuProps {
  /** Hides the watch action when the season has nothing aired to mark. */
  canMarkWatched: boolean;
  /** Hides the unwatch action when the season has no watch history to clear. */
  canUnwatch: boolean;
  onMarkSeasonWatched: () => void;
  onUnwatchSeason: () => void;
}

const MENU_ITEM_CLASS =
  "block w-full px-4 py-3.5 text-left text-xs font-mono text-muted hover:text-snow hover:bg-white/5 transition-colors border-b border-white/5";

/**
 * Season-scoped bulk actions, hung beside the SeasonSection pill. Per-episode
 * "watch up to here" covers the common forward path, so this menu exists mainly
 * to keep the bulk *unwatch* reachable — there is no other entry point for it.
 */
export function SeasonActionsMenu({
  canMarkWatched,
  canUnwatch,
  onMarkSeasonWatched,
  onUnwatchSeason,
}: SeasonActionsMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  function act(action: () => void) {
    setOpen(false);
    action();
  }

  // Nothing actionable — render no trigger rather than an empty menu.
  if (!canMarkWatched && !canUnwatch) return null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("series.seasonMenu")}
        className="flex h-7 w-7 items-center justify-center text-muted transition-colors hover:text-snow"
      >
        <MoreHorizontal size={16} strokeWidth={1.5} />
      </button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        desktop="popover"
        popoverClassName="w-56"
        title={t("series.seasonMenu")}
        className="!p-0 !overflow-hidden"
      >
        {canMarkWatched && (
          <button
            type="button"
            onClick={() => act(onMarkSeasonWatched)}
            className={MENU_ITEM_CLASS}
          >
            {t("series.markSeasonWatched")}
          </button>
        )}
        {canUnwatch && (
          <button
            type="button"
            onClick={() => act(onUnwatchSeason)}
            className="block w-full px-4 py-3.5 text-left text-xs font-mono text-red-400 transition-colors hover:bg-white/5 hover:text-red-300"
          >
            {t("series.unwatchSeason")}
          </button>
        )}
      </Modal>
    </div>
  );
}
