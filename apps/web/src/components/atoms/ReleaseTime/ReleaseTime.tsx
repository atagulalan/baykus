import { useTranslation } from "react-i18next";

/** Prototype air-time display — local + origin in parentheses.
 * Real airstamp data is not stored yet; times are derived from itemId for a
 * stable mock until providers feed air times through the API. */
export function getMockTimeData(itemId: number): { localTime: string; originTime: string } {
  const seed = (itemId * 13) % 24;
  const hour = seed.toString().padStart(2, "0");
  const localTime = `${hour}:00`;
  const diff = -8;
  const originHour = (seed + diff + 24) % 24;
  const originTime = `${originHour.toString().padStart(2, "0")}:00 EST`;
  return { localTime, originTime };
}

/** Meta-row text for episode details — matches aired/watched row styling. */
export function ReleaseTime({ itemId }: { itemId: number }) {
  const { t } = useTranslation();
  const { localTime, originTime } = getMockTimeData(itemId);

  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 text-muted">{t("episode.airTime")}</span>
      <span className="min-w-0 text-right text-snow/80 tabular-nums">
        {localTime}
        <span className="text-muted"> ({originTime})</span>
      </span>
    </div>
  );
}
