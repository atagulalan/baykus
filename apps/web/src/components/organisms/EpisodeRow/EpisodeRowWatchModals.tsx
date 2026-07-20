import { useTranslation } from "react-i18next";
import { Modal } from "../../molecules/Modal/Modal.tsx";

interface EpisodeRowWatchModalsProps {
  showMarkUpToHereModal: boolean;
  onCloseMarkUpToHereModal: () => void;
  showWatchedOptionsModal: boolean;
  onCloseWatchedOptionsModal: () => void;
  onBulkUpToHere?: (() => void) | undefined;
  onToggleWatch?: (() => void) | undefined;
  onWatchAgain?: (() => void) | undefined;
  onEditDate?: (() => void) | undefined;
  watchCount: number;
}

export function EpisodeRowWatchModals({
  showMarkUpToHereModal,
  onCloseMarkUpToHereModal,
  showWatchedOptionsModal,
  onCloseWatchedOptionsModal,
  onBulkUpToHere,
  onToggleWatch,
  onWatchAgain,
  onEditDate,
  watchCount,
}: EpisodeRowWatchModalsProps) {
  const { t } = useTranslation();

  return (
    <>
      {showMarkUpToHereModal && onBulkUpToHere && onToggleWatch && (
        <Modal
          isOpen={showMarkUpToHereModal}
          onClose={onCloseMarkUpToHereModal}
          className="p-6 text-center"
        >
          <h2 className="mb-4 font-display text-lg text-snow italic">
            {t("episode.watchedUpToHereTitle")}
          </h2>
          <p className="mb-6 text-muted text-sm">{t("episode.watchedUpToHereDesc")}</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                onCloseMarkUpToHereModal();
                onBulkUpToHere();
              }}
              className="w-full rounded-lg bg-yellow px-4 py-2 font-mono text-[#080808] text-xs uppercase tracking-widest transition-opacity hover:opacity-90"
            >
              {t("episode.watchedUpToHere")}
            </button>
            <button
              type="button"
              onClick={() => {
                onCloseMarkUpToHereModal();
                onToggleWatch();
              }}
              className="w-full rounded-lg border border-white/10 px-4 py-2 font-mono text-snow text-xs uppercase tracking-widest transition-colors hover:bg-white/5"
            >
              {t("episode.markOnlyThis")}
            </button>
          </div>
        </Modal>
      )}

      {showWatchedOptionsModal && onWatchAgain && onEditDate && onToggleWatch && (
        <Modal
          isOpen={showWatchedOptionsModal}
          onClose={onCloseWatchedOptionsModal}
          desktop="popover"
          popoverAlign="end-top"
          popoverClassName="w-56"
          title={t("episode.menu")}
          className="!p-0 !overflow-hidden"
        >
          <button
            type="button"
            onClick={() => {
              onCloseWatchedOptionsModal();
              onWatchAgain();
            }}
            className="block w-full border-white/5 border-b px-4 py-3.5 text-left font-mono text-muted text-xs transition-colors hover:bg-white/5 hover:text-snow"
          >
            {t("episode.watchAgain")}
          </button>
          <button
            type="button"
            onClick={() => {
              onCloseWatchedOptionsModal();
              onEditDate();
            }}
            className="block w-full border-white/5 border-b px-4 py-3.5 text-left font-mono text-muted text-xs transition-colors hover:bg-white/5 hover:text-snow"
          >
            {t("episode.editDate")}
          </button>
          <button
            type="button"
            onClick={() => {
              onCloseWatchedOptionsModal();
              onToggleWatch();
            }}
            className="block w-full px-4 py-3.5 text-left font-mono text-red-400 text-xs transition-colors hover:bg-white/5 hover:text-red-300"
          >
            {watchCount > 1 ? t("episode.removeRewatch") : t("episode.markAsUnwatched")}
          </button>
        </Modal>
      )}
    </>
  );
}
