import type { TFunction } from "i18next";

/** Compact day unit under the countdown number (episode.countdownUnit.day). */
export function countdownDayUnit(count: number, t: TFunction): string {
  return t("episode.countdownUnit.day", { count });
}

/** Compact hour unit under the H:MM countdown (episode.countdownUnit.hour). */
export function countdownHourUnit(count: number, t: TFunction): string {
  return t("episode.countdownUnit.hour", { count });
}

/** Compact minute unit under the countdown number (episode.countdownUnit.minute). */
export function countdownMinuteUnit(t: TFunction): string {
  return t("episode.countdownUnit.minute");
}

/** Compact second unit under the countdown number (episode.countdownUnit.second). */
export function countdownSecondUnit(t: TFunction): string {
  return t("episode.countdownUnit.second");
}
