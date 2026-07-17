import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "./Modal.tsx";

interface TmdbKeyDialogProps {
  onClose: () => void;
  onSave: (key: string) => void;
  onClear: () => void;
  pending: boolean;
  isSet: boolean;
}

export function TmdbKeyDialog({ onClose, onSave, onClear, pending, isSet }: TmdbKeyDialogProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");

  const handleSave = () => {
    const value = input.trim();
    if (!value) return;
    onSave(value);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      className="flex flex-col gap-4 p-4 sm:p-5 max-w-sm w-full"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-display italic text-snow text-lg flex items-center justify-between">
          <span>{t("settings.providers.tmdbKey")}</span>
          {isSet && (
            <span className="text-yellow font-sans not-italic text-xs tracking-normal">
              {t("settings.providers.tmdbKeySet")}
            </span>
          )}
        </h2>
        <p className="text-xs text-muted font-mono leading-relaxed mt-1">
          {t("settings.providers.tmdbKeyDescription", {
            defaultValue:
              "Kendi TMDB API anahtarınız varsa oran limitlerine takılmamak için buraya girebilirsiniz.",
          })}
        </p>
      </div>

      <input
        type="password"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={t("settings.providers.tmdbKeyPlaceholder")}
        className="border border-white/10 bg-white/5 px-3 py-2 text-sm text-snow focus:border-yellow focus:outline-none transition-colors w-full"
        autoComplete="off"
      />

      <div className="mt-2 flex justify-end gap-2">
        {isSet && (
          <button
            type="button"
            onClick={onClear}
            disabled={pending}
            className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-red-400 mr-auto transition-colors disabled:opacity-50"
          >
            {t("settings.providers.clear")}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-snow transition-colors"
        >
          {t("search.cancel")}
        </button>
        <button
          type="button"
          disabled={pending || !input.trim()}
          onClick={handleSave}
          className="bg-yellow text-[#080808] font-mono text-[10px] uppercase tracking-widest px-4 py-2.5 disabled:opacity-50 transition-opacity hover:opacity-90"
        >
          {t("settings.save")}
        </button>
      </div>
    </Modal>
  );
}
