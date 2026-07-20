import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../molecules/Modal/Modal.tsx";

interface SeasonActionsMenuProps {
  canMarkWatched: boolean;
  canUnwatch: boolean;
  onMarkSeasonWatched: () => void;
  onUnwatchSeason: () => void;
  /** Visual inside the menu trigger (circular progress ring). */
  children: ReactNode;
}

const MENU_ITEM_CLASS =
  "block w-full px-4 py-3.5 text-left text-xs font-mono text-muted hover:text-snow hover:bg-white/5 transition-colors border-b border-white/5";

/**
 * Season bulk actions opened from the progress ring. E172: zero-watch seasons
 * mark immediately from this trigger — no popover/sheet.
 */
export function SeasonActionsMenu({
  canMarkWatched,
  canUnwatch,
  onMarkSeasonWatched,
  onUnwatchSeason,
  children,
}: SeasonActionsMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  function act(action: () => void) {
    setOpen(false);
    action();
  }

  if (!canMarkWatched && !canUnwatch) {
    return <span className="flex size-8 items-center justify-center">{children}</span>;
  }

  const markOnly = canMarkWatched && !canUnwatch;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          if (markOnly) {
            onMarkSeasonWatched();
            return;
          }
          setOpen((v) => !v);
        }}
        aria-label={markOnly ? t("series.markSeasonWatched") : t("series.seasonMenu")}
        aria-haspopup={markOnly ? undefined : "dialog"}
        aria-expanded={markOnly ? undefined : open}
        className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/10 focus-visible:bg-white/10"
      >
        {children}
      </button>
      {!markOnly ? (
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          desktop="popover"
          popoverAlign="center"
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
      ) : null}
    </div>
  );
}
