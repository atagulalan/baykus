import { useState } from "react";
import { useTranslation } from "react-i18next";

interface WatchDateDialogProps {
  /** ISO datetime to prefill, e.g. the episode's last watch event. */
  initialValue: string;
  onConfirm: (isoDatetime: string) => void;
  onClose: () => void;
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function WatchDateDialog({ initialValue, onConfirm, onClose }: WatchDateDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(() => toLocalInputValue(initialValue));

  function handleConfirm() {
    onConfirm(new Date(value).toISOString());
  }

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
        className="relative w-full max-w-xs border border-white/10 bg-[#101010] p-4 shadow-2xl backdrop-blur-md"
      >
        <h2 className="mb-3 font-display italic text-snow text-lg">{t("episode.editDate")}</h2>
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-snow focus:border-yellow focus:outline-none"
        />
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
            onClick={handleConfirm}
            className="bg-yellow text-[#080808] font-mono text-[10px] uppercase tracking-widest px-4 py-2.5"
          >
            {t("episode.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
