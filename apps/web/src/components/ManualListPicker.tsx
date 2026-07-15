import { useTranslation } from "react-i18next";
import type { ManualList } from "../api/types.ts";

interface ManualListPickerProps {
  value: ManualList | null;
  onChange: (value: ManualList | null) => void;
}

/** Search add-flow's 2-option picker: Ekle (default, dynamic) and Sonra izlenecek. */
export function ManualListPicker({ value, onChange }: ManualListPickerProps) {
  const { t } = useTranslation();
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : (e.target.value as ManualList))}
      aria-label={t("manualList.label")}
      className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
    >
      <option value="">{t("manualList.addDefault")}</option>
      <option value="watch_later">{t("manualList.watch_later")}</option>
    </select>
  );
}
