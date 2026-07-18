import { useTranslation } from "react-i18next";
import type { Stats } from "../../api/types.ts";
import { MiniBars } from "./MiniBars.tsx";

interface WeekdayHourSectionProps {
  stats: Pick<Stats, "byWeekday" | "byHour">;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Monday-first weekday short labels, derived without assuming any specific date's weekday. */
function weekdayShortLabels(): string[] {
  const anyDate = new Date(Date.UTC(2024, 0, 1));
  const mondayOffsetMs = ((anyDate.getUTCDay() + 6) % 7) * MS_PER_DAY;
  const monday = new Date(anyDate.getTime() - mondayOffsetMs);
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(
      new Date(monday.getTime() + i * MS_PER_DAY),
    ),
  );
}

/** spec.md §18-19 (E107) — Monday-first weekday counts + local hour-of-day counts, dated watch events. */
export function WeekdayHourSection({ stats }: WeekdayHourSectionProps) {
  const { t } = useTranslation();
  if (stats.byWeekday.every((c) => c === 0) && stats.byHour.every((c) => c === 0)) return null;
  const weekdayLabels = weekdayShortLabels();

  return (
    <section className="content-inset flex flex-col gap-6 sm:flex-row sm:gap-8">
      <div className="flex flex-1 flex-col gap-4">
        <h2 className="font-display italic text-snow text-2xl tracking-tight">
          {t("stats.byWeekday.title")}
        </h2>
        <MiniBars
          items={stats.byWeekday.map((count, i) => ({
            key: String(i),
            label: weekdayLabels[i] ?? "",
            value: count,
            tooltip: `${weekdayLabels[i]}: ${count}`,
          }))}
        />
      </div>
      <div className="flex flex-1 flex-col gap-4">
        <h2 className="font-display italic text-snow text-2xl tracking-tight">
          {t("stats.byHour.title")}
        </h2>
        <MiniBars
          labelEvery={3}
          items={stats.byHour.map((count, hour) => ({
            key: String(hour),
            label: String(hour),
            value: count,
            tooltip: `${hour}:00${t("common.separator")}${count}`,
          }))}
        />
      </div>
    </section>
  );
}
