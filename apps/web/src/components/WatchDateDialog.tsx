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
        className="relative w-full max-w-xs rounded-lg bg-zinc-900 p-4 shadow-xl"
      >
        <h2 className="mb-3 font-medium text-sm">{t("episode.editDate")}</h2>
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100"
          >
            {t("search.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded bg-emerald-600 px-3 py-1.5 font-medium text-sm text-white"
          >
            {t("episode.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
