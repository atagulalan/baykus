import { useTranslation } from "react-i18next";
import type { TrackingStatus } from "../api/types.ts";

const STATUSES: TrackingStatus[] = ["watching", "plan_to_watch", "completed", "dropped", "paused"];

interface StatusPickerProps {
  value: TrackingStatus;
  onChange: (status: TrackingStatus) => void;
}

export function StatusPicker({ value, onChange }: StatusPickerProps) {
  const { t } = useTranslation();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TrackingStatus)}
      aria-label={t("status.label")}
      className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
    >
      {STATUSES.map((status) => (
        <option key={status} value={status}>
          {t(`status.${status}`)}
        </option>
      ))}
    </select>
  );
}
