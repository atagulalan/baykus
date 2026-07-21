/** Mirror of apps/web genreKey — maps genre display names to i18n keys. */
export function genreKey(genre: string): string {
  return genre.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

const KNOWN_STATUSES = new Set([
  "returning",
  "ended",
  "canceled",
  "in_production",
  "planned",
  "pilot",
]);

/** Translates releaseStatus; unrecognized strings pass through. */
export function releaseStatusLabel(
  t: (key: string) => string,
  status: string | null | undefined,
): string | null {
  if (!status) return null;
  if (!KNOWN_STATUSES.has(status)) return status;
  return t(`series.releaseStatus.${status}`);
}

const STALE_REFRESH_HOURS = 24;

/** E63 mirror — last refresh older than 24h (or null) is stale. */
export function isStale(
  lastRefreshedAt: string | null | undefined,
  now: string = new Date().toISOString(),
): boolean {
  if (lastRefreshedAt == null) return true;
  return (
    new Date(lastRefreshedAt).getTime() <
    new Date(now).getTime() - STALE_REFRESH_HOURS * 60 * 60 * 1000
  );
}

export function languageDisplayName(code: string, locale: string): string | null {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? null;
  } catch {
    return null;
  }
}
