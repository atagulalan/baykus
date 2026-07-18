import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../molecules/Modal/Modal.tsx";

interface WatchDateDialogProps {
  /** ISO datetime to prefill, e.g. the episode's last watch event. */
  initialValue: string;
  onConfirm: (isoDatetime: string) => void;
  onClose: () => void;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function WatchDateDialog({ initialValue, onConfirm, onClose }: WatchDateDialogProps) {
  const { t } = useTranslation();
  const initDate = new Date(initialValue);
  const [date, setDate] = useState(
    `${initDate.getFullYear()}-${pad(initDate.getMonth() + 1)}-${pad(initDate.getDate())}`,
  );
  const [time, setTime] = useState(`${pad(initDate.getHours())}:${pad(initDate.getMinutes())}`);

  function handleConfirm() {
    if (!date) return;
    const datetime = new Date(`${date}T${time || "00:00"}`);
    onConfirm(datetime.toISOString());
  }

  function setNow() {
    const now = new Date();
    setDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  }

  function setYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    setTime("20:00");
  }

  return (
    <Modal isOpen={true} onClose={onClose} className="p-4 sm:p-4">
      <h2 className="font-display italic text-snow text-lg">{t("episode.editDate")}</h2>
      <p className="mb-4 font-mono text-[10px] text-muted">{t("episode.editDateHint")}</p>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={setNow}
          className="flex-1 border border-white/10 bg-white/5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-snow"
        >
          {t("episode.datePreset.now")}
        </button>
        <button
          type="button"
          onClick={setYesterday}
          className="flex-1 border border-white/10 bg-white/5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-snow"
        >
          {t("episode.datePreset.yesterday")}
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full flex-[2] border border-white/10 bg-white/5 px-3 py-2 text-sm text-snow focus:border-yellow focus:outline-none"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full flex-1 border border-white/10 bg-white/5 px-3 py-2 text-sm text-snow focus:border-yellow focus:outline-none"
        />
      </div>
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
          disabled={!date}
          className="bg-yellow px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#080808] disabled:opacity-50"
        >
          {t("episode.save")}
        </button>
      </div>
    </Modal>
  );
}
