import type { TFunction } from "i18next";

const KNOWN_STATUSES = new Set([
  "returning",
  "ended",
  "canceled",
  "in_production",
  "planned",
  "pilot",
]);

/** Translates a provider `releaseStatus` enum value; unrecognized/legacy strings pass through raw. */
export function releaseStatusLabel(t: TFunction, status: string | null): string | null {
  if (!status) return null;
  if (!KNOWN_STATUSES.has(status)) return status;
  return t(`series.releaseStatus.${status}`);
}
